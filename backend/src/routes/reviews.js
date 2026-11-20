const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/:productId/reviews', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: 'Invalid product id.' });
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const [reviews, total] = await Promise.all([
      Review.find({ product: req.params.productId }).populate('user', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Review.countDocuments({ product: req.params.productId }),
    ]);
    return res.json({ reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.post('/:productId/reviews', authenticate, authorizeRoles('customer'), async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: 'Invalid product id.' });
  const rating = Number(req.body?.rating);
  const comment = req.body?.comment;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.trim().length < 2 || comment.trim().length > 2000) {
    return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5 and comment must be 2–2000 characters.' });
  }
  try {
    if (!await Product.exists({ _id: req.params.productId })) return res.status(404).json({ message: 'Product not found.' });
    const purchase = await Order.exists({ user: req.user._id, status: { $in: ['paid', 'shipped', 'delivered'] }, 'items.product': req.params.productId });
    if (!purchase) return res.status(403).json({ message: 'A completed purchase of this product is required to leave a review.' });
    const review = await Review.create({ product: req.params.productId, user: req.user._id, rating, comment: comment.trim() });
    await review.populate('user', 'name');
    return res.status(201).json({ review });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already reviewed this product.' });
    return next(error);
  }
});

module.exports = router;
