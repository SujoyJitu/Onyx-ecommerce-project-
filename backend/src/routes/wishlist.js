const express = require('express');
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorizeRoles('customer'));

router.get('/', async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({ path: 'products', match: { status: 'active', moderationStatus: 'visible' }, populate: { path: 'category', select: 'name slug' } });
    return res.json({ wishlist: wishlist || { products: [] } });
  } catch (error) { return next(error); }
});

router.post('/:productId', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: 'Invalid product id.' });
  try {
    const product = await Product.findOne({ _id: req.params.productId, status: 'active', moderationStatus: 'visible' });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (!await Shop.exists({ owner: product.vendor, status: 'approved' })) return res.status(404).json({ message: 'Product not found.' });
    if (await User.exists({ _id: product.vendor, isBlocked: true })) return res.status(404).json({ message: 'Product not found.' });
    const wishlist = await Wishlist.findOneAndUpdate({ user: req.user._id }, { $addToSet: { products: product._id }, $setOnInsert: { user: req.user._id } }, { new: true, upsert: true }).populate('products');
    return res.json({ wishlist });
  } catch (error) { return next(error); }
});

router.delete('/:productId', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: 'Invalid product id.' });
  try {
    const wishlist = await Wishlist.findOneAndUpdate({ user: req.user._id }, { $pull: { products: req.params.productId } }, { new: true }).populate('products');
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found.' });
    return res.json({ wishlist });
  } catch (error) { return next(error); }
});

module.exports = router;
