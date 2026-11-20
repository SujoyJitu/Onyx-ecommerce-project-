const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { uploadProductImages } = require('../middleware/productUpload');
const { uploadImageBuffer, deleteImages } = require('../services/cloudinary');

const router = express.Router();
const vendorOnly = [authenticate, authorizeRoles('vendor')];
const editableFields = ['title', 'description', 'price', 'discountPrice', 'stock', 'category', 'brand', 'specifications', 'status'];
const productStatuses = new Set(['draft', 'active', 'archived']);

// Public catalog endpoints are declared before /:id vendor mutations.
router.get('/suggestions', async (req, res, next) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
  if (q.length < 2) return res.json({ suggestions: [] });
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const shops = await Shop.find({ status: 'approved' }).select('owner').lean();
    const vendors = await User.find({ _id: { $in: shops.map((shop) => shop.owner) }, isBlocked: { $ne: true } }).distinct('_id');
    const products = await Product.find({ status: 'active', moderationStatus: 'visible', vendor: { $in: vendors }, $or: [{ title: { $regex: `^${escaped}`, $options: 'i' } }, { brand: { $regex: `^${escaped}`, $options: 'i' } }] }).select('title brand').limit(7).lean();
    return res.json({ suggestions: products });
  } catch (error) { return next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { status: 'active', moderationStatus: 'visible' };
    const approvedShops = await Shop.find({ status: 'approved' }).select('owner').lean();
    const approvedVendors = await User.find({ _id: { $in: approvedShops.map((shop) => shop.owner) }, isBlocked: { $ne: true } }).distinct('_id');
    filter.vendor = { $in: approvedVendors };
    if (req.query.category) {
      if (mongoose.isValidObjectId(req.query.category)) filter.category = req.query.category;
      else {
        const category = await Category.findOne({ slug: String(req.query.category).toLowerCase() }).select('_id');
        if (!category) return res.json({ products: [], pagination: { page, limit, total: 0, pages: 0 } });
        filter.category = category._id;
      }
    }
    if (req.query.q) filter.$text = { $search: String(req.query.q).trim() };
    if (req.query.brand) filter.brand = String(req.query.brand).trim();
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.price = {};
      const min = Number(req.query.minPrice);
      const max = Number(req.query.maxPrice);
      if (req.query.minPrice !== undefined && Number.isFinite(min) && min >= 0) filter.price.$gte = min;
      if (req.query.maxPrice !== undefined && Number.isFinite(max) && max >= 0) filter.price.$lte = max;
    }
    const sortOptions = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, title_asc: { title: 1 }, title_desc: { title: -1 } };
    const sort = sortOptions[req.query.sort] || sortOptions.newest;
    const [products, total] = await Promise.all([
      Product.find(filter).populate('category', 'name slug').populate('vendor', 'name').sort(sort).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    const summaries = await Review.aggregate([
      { $match: { product: { $in: products.map((product) => product._id) } } },
      { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const byProduct = new Map(summaries.map((summary) => [summary._id.toString(), { average: Math.round(summary.average * 10) / 10, count: summary.count }]));
    products.forEach((product) => { product.set('ratingSummary', byProduct.get(product._id.toString()) || { average: 0, count: 0 }, { strict: false }); });
    return res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

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

router.get('/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product id.' });
  try {
    const product = await Product.findOne({ _id: req.params.id, status: 'active', moderationStatus: 'visible' }).populate('category', 'name slug').populate('vendor', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (!await Shop.exists({ owner: product.vendor._id, status: 'approved' }) || await User.exists({ _id: product.vendor._id, isBlocked: true })) return res.status(404).json({ message: 'Product not found.' });
    return res.json({ product });
  } catch (error) { return next(error); }
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
