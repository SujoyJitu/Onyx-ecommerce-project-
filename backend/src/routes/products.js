const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { uploadProductImages } = require('../middleware/productUpload');
const { uploadImageBuffer, deleteImages } = require('../services/cloudinary');

const router = express.Router();
const vendorOnly = [authenticate, authorizeRoles('vendor')];
const editableFields = ['title', 'description', 'price', 'discountPrice', 'stock', 'category', 'brand', 'specifications', 'status'];
const productStatuses = new Set(['draft', 'active', 'archived']);

function parseSpecifications(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { throw Object.assign(new Error('Specifications must be valid JSON.'), { statusCode: 400 }); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error('Specifications must be a JSON object.'), { statusCode: 400 });
  }
  return value;
}

function parseProductInput(body, { partial = false } = {}) {
  const input = {};
  const errors = [];
  for (const field of editableFields) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (field === 'title' || field === 'description' || field === 'brand') {
      if (typeof value !== 'string') errors.push({ field, message: `${field} must be text.` });
      else input[field] = value.trim();
    } else if (field === 'price' || field === 'discountPrice' || field === 'stock') {
      if (field === 'discountPrice' && (value === '' || value === null)) {
        input[field] = null;
      } else {
        const number = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(number) || number < 0 || (field === 'stock' && !Number.isInteger(number))) {
          errors.push({ field, message: `${field} must be a valid ${field === 'stock' ? 'non-negative whole number' : 'non-negative number'}.` });
        } else input[field] = number;
      }
    } else if (field === 'category') {
      if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) errors.push({ field, message: 'Select a valid category.' });
      else input[field] = value;
    } else if (field === 'status') {
      if (!productStatuses.has(value)) errors.push({ field, message: 'Status must be draft, active, or archived.' });
      else input[field] = value;
    } else if (field === 'specifications') {
      try { input[field] = parseSpecifications(value); } catch (error) { errors.push({ field, message: error.message }); }
    }
  }

  if (!partial) {
    for (const field of ['title', 'description', 'price', 'stock', 'category']) {
      if (!Object.hasOwn(input, field)) errors.push({ field, message: `${field} is required.` });
    }
    if (Object.hasOwn(input, 'title') && input.title.length < 2) errors.push({ field: 'title', message: 'Title must be at least 2 characters.' });
    if (Object.hasOwn(input, 'description') && !input.description) errors.push({ field: 'description', message: 'Description is required.' });
  }
  if (input.discountPrice !== null && input.discountPrice !== undefined && input.price !== undefined && input.discountPrice > input.price) {
    errors.push({ field: 'discountPrice', message: 'Discount price cannot be higher than the regular price.' });
  }
  return { input, errors };
}

async function uploadFiles(files) {
  const uploaded = [];
  try {
    for (const file of files) uploaded.push(await uploadImageBuffer(file.buffer));
    return uploaded;
  } catch (error) {
    await deleteImages(uploaded);
    throw error;
  }
}

router.post('/', ...vendorOnly, uploadProductImages, async (req, res, next) => {
  const { input, errors } = parseProductInput(req.body || {});
  if (errors.length) return res.status(400).json({ message: 'Please correct the product details.', errors });
  try {
    if (!await Category.exists({ _id: input.category })) {
      return res.status(400).json({ message: 'The selected category does not exist.', errors: [{ field: 'category', message: 'Select an existing category.' }] });
    }
    const images = await uploadFiles(req.productImageFiles || []);
    try {
      const product = await Product.create({ ...input, images, vendor: req.user._id });
      return res.status(201).json({ message: 'Product created successfully.', product });
    } catch (error) {
      await deleteImages(images);
      throw error;
    }
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    return next(error);
  }
});

router.get('/my', ...vendorOnly, async (req, res, next) => {
  try {
    const products = await Product.find({ vendor: req.user._id }).populate('category', 'name slug').sort({ createdAt: -1 });
    return res.json({ products });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', ...vendorOnly, uploadProductImages, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product id.' });
  const { input, errors } = parseProductInput(req.body || {}, { partial: true });
  if (errors.length) return res.status(400).json({ message: 'Please correct the product details.', errors });
  try {
    if (input.category && !await Category.exists({ _id: input.category })) {
      return res.status(400).json({ message: 'The selected category does not exist.', errors: [{ field: 'category', message: 'Select an existing category.' }] });
    }
    const product = await Product.findOne({ _id: req.params.id, vendor: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    const newImages = await uploadFiles(req.productImageFiles || []);
    const oldImages = product.images;
    Object.assign(product, input);
    if (newImages.length) product.images = newImages;
    try {
      await product.save();
    } catch (error) {
      await deleteImages(newImages);
      if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
      throw error;
    }
    if (newImages.length) await deleteImages(oldImages);
    return res.json({ message: 'Product updated successfully.', product });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', ...vendorOnly, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product id.' });
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, vendor: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    await deleteImages(product.images);
    return res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
