const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorizeRoles('customer'));

router.get('/', async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate({ path: 'items.product', match: { status: 'active', moderationStatus: 'visible' }, populate: { path: 'category', select: 'name slug' } });
    return res.json({ cart: cart || { items: [] } });
  } catch (error) { return next(error); }
});

router.post('/items', async (req, res, next) => {
  const { productId, quantity = 1 } = req.body || {};
  if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: 'Provide a valid productId and positive whole-number quantity.' });
  try {
    const product = await Product.findOne({ _id: productId, status: 'active', moderationStatus: 'visible' });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (!await Shop.exists({ owner: product.vendor, status: 'approved' })) return res.status(404).json({ message: 'Product not found.' });
    if (await User.exists({ _id: product.vendor, isBlocked: true })) return res.status(404).json({ message: 'Product not found.' });
    const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $setOnInsert: { user: req.user._id } }, { new: true, upsert: true });
    const item = cart.items.find((entry) => entry.product.toString() === productId);
    const nextQuantity = (item?.quantity || 0) + quantity;
    if (nextQuantity > product.stock) return res.status(400).json({ message: 'Requested quantity exceeds available stock.' });
    if (item) item.quantity = nextQuantity;
    else cart.items.push({ product: product._id, quantity });
    await cart.save();
    await cart.populate('items.product');
    return res.json({ cart });
  } catch (error) { return next(error); }
});

router.patch('/items/:productId', async (req, res, next) => {
  const { productId } = req.params;
  const { quantity } = req.body || {};
  if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: 'Provide a positive whole-number quantity.' });
  try {
    const product = await Product.findOne({ _id: productId, status: 'active', moderationStatus: 'visible' });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    if (!await Shop.exists({ owner: product.vendor, status: 'approved' })) return res.status(404).json({ message: 'Product not found.' });
    if (await User.exists({ _id: product.vendor, isBlocked: true })) return res.status(404).json({ message: 'Product not found.' });
    if (quantity > product.stock) return res.status(400).json({ message: 'Requested quantity exceeds available stock.' });
    const cart = await Cart.findOne({ user: req.user._id });
    const item = cart?.items.find((entry) => entry.product.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Cart item not found.' });
    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product');
    return res.json({ cart });
  } catch (error) { return next(error); }
});

router.delete('/items/:productId', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: 'Invalid product id.' });
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart item not found.' });
    const before = cart.items.length;
    cart.items = cart.items.filter((entry) => entry.product.toString() !== req.params.productId);
    if (before === cart.items.length) return res.status(404).json({ message: 'Cart item not found.' });
    await cart.save();
    await cart.populate('items.product');
    return res.json({ cart });
  } catch (error) { return next(error); }
});

module.exports = router;
