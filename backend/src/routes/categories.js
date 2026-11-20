const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().select('name slug image').sort({ name: 1 });
    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, authorizeRoles('admin'), async (req, res, next) => {
  const { name, slug, image = '' } = req.body || {};
  try {
    const category = await Category.create({ name, slug, image });
    return res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Category name or slug already exists.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    return next(error);
  }
});

router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid category id.' });
  const allowed = {};
  for (const field of ['name', 'slug', 'image']) if (req.body?.[field] !== undefined) allowed[field] = req.body[field];
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    return res.json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Category name or slug already exists.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    return next(error);
  }
});

router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid category id.' });
  try {
    if (await Product.exists({ category: req.params.id })) return res.status(409).json({ message: 'Reassign or remove products in this category before deleting it.' });
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    return res.json({ message: 'Category deleted.' });
  } catch (error) { return next(error); }
});

module.exports = router;
