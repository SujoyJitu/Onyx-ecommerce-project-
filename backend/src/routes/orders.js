const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const customerOnly = [authenticate, authorizeRoles('customer')];
const vendorOnly = [authenticate, authorizeRoles('vendor')];
const paymentMethods = new Set(['cash_on_delivery']);
const transitions = { processing: 'pending', shipped: 'processing', delivered: 'shipped' };

function publicOrder(order) {
  return order.populate([
    { path: 'customer', select: 'name email phone' },
    { path: 'items.product', select: 'title images' },
    { path: 'items.vendor', select: 'name' },
  ]);
}

function aggregateStatus(items) {
  if (items.every((item) => item.fulfillmentStatus === 'cancelled')) return 'cancelled';
  if (items.every((item) => item.fulfillmentStatus === 'delivered')) return 'delivered';
  if (items.every((item) => ['shipped', 'delivered'].includes(item.fulfillmentStatus))) return 'shipped';
  if (items.some((item) => ['processing', 'shipped', 'delivered'].includes(item.fulfillmentStatus))) return 'processing';
  return 'pending';
}

router.post('/', ...customerOnly, async (req, res, next) => {
  const { address, paymentMethod } = req.body || {};
  if (!paymentMethods.has(paymentMethod)) return res.status(400).json({ message: 'Cash on delivery is currently the only available payment method.' });
  if (!address || typeof address !== 'object' || Array.isArray(address)) return res.status(400).json({ message: 'A delivery address is required.' });
  if (req.body?.items !== undefined && !Array.isArray(req.body.items)) return res.status(400).json({ message: 'Items must be an array.' });

  let cart;
  try {
    cart = !Array.isArray(req.body.items) || req.body.items.length === 0
      ? await Cart.findOne({ user: req.user._id })
      : null;
  } catch (error) { return next(error); }
  const requestedItems = Array.isArray(req.body.items) && req.body.items.length
    ? req.body.items
    : (cart?.items || []).map((item) => ({ productId: item.product.toString(), qty: item.quantity }));
  if (!requestedItems.length) return res.status(400).json({ message: 'Add at least one item before placing an order.' });

  const quantities = new Map();
  for (const item of requestedItems) {
    const productId = item?.productId || item?.product;
    const qty = item?.qty ?? item?.quantity;
    if (!mongoose.isValidObjectId(productId) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'Each item needs a valid productId and positive whole-number qty.' });
    }
    const key = productId.toString();
    quantities.set(key, (quantities.get(key) || 0) + qty);
  }

  const reservations = [];
  let createdOrder = null;
  try {
    const lines = [];
    for (const [productId, qty] of quantities) {
      const product = await Product.findOneAndUpdate(
        { _id: productId, status: 'active', stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true },
      );
      if (!product) {
        const exists = await Product.exists({ _id: productId, status: 'active' });
        const reason = exists ? 'Requested quantity exceeds available stock.' : 'A requested product is unavailable.';
        const error = Object.assign(new Error(reason), { statusCode: 409 });
        throw error;
      }
      reservations.push({ productId: product._id, qty });
      lines.push({
        product: product._id,
        vendor: product.vendor,
        qty,
        price: product.discountPrice ?? product.price,
        title: product.title,
        image: product.images?.[0]?.url || '',
      });
    }

    const total = Math.round(lines.reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100;
    const order = await Order.create({ customer: req.user._id, items: lines, address, paymentMethod, total });
    createdOrder = order;
    if (cart) {
      await Cart.updateOne({ _id: cart._id }, { $pull: { items: { product: { $in: lines.map((line) => line.product) } } } }).catch(() => {});
    }
    await publicOrder(order);
    return res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    if (createdOrder) {
      return res.status(201).json({ message: 'Order placed successfully.', order: createdOrder });
    }
    await Promise.allSettled(reservations.map(({ productId, qty }) => Product.updateOne({ _id: productId }, { $inc: { stock: qty } })));
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    return next(error);
  }
});

router.get('/my', ...customerOnly, async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.product', 'title images')
      .populate('items.vendor', 'name')
      .sort({ createdAt: -1 });
    return res.json({ orders });
  } catch (error) { return next(error); }
});

router.get('/vendor', ...vendorOnly, async (req, res, next) => {
  try {
    const orders = await Order.find({ 'items.vendor': req.user._id })
      .populate('customer', 'name email phone')
      .populate('items.product', 'title images')
      .sort({ createdAt: -1 });
    const vendorOrders = orders.map((order) => {
      const result = order.toObject();
      result.items = result.items.filter((item) => item.vendor.toString() === req.user._id.toString());
      return result;
    });
    return res.json({ orders: vendorOrders });
  } catch (error) { return next(error); }
});

router.get('/:id', ...customerOnly, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order id.' });
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
      .populate('items.product', 'title images')
      .populate('items.vendor', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    return res.json({ order });
  } catch (error) { return next(error); }
});

router.put('/:id/status', ...vendorOnly, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order id.' });
  const nextStatus = req.body?.status;
  if (!Object.hasOwn(transitions, nextStatus)) return res.status(400).json({ message: 'Status must be processing, shipped, or delivered.' });
  try {
    const order = await Order.findOne({ _id: req.params.id, 'items.vendor': req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    const vendorItems = order.items.filter((item) => item.vendor.toString() === req.user._id.toString());
    if (!vendorItems.length) return res.status(404).json({ message: 'Order not found.' });
    if (vendorItems.some((item) => item.fulfillmentStatus !== transitions[nextStatus])) {
      return res.status(409).json({ message: `Vendor items must be ${transitions[nextStatus]} before they can be marked ${nextStatus}.` });
    }
    vendorItems.forEach((item) => { item.fulfillmentStatus = nextStatus; });
    order.orderStatus = aggregateStatus(order.items);
    await order.save();
    await publicOrder(order);
    const result = order.toObject();
    result.items = result.items.filter((item) => item.vendor?._id?.toString() === req.user._id.toString() || item.vendor?.toString() === req.user._id.toString());
    return res.json({ order: result });
  } catch (error) { return next(error); }
});

router.post('/:id/cancel', ...customerOnly, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order id.' });
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, orderStatus: { $in: ['pending', 'processing'] }, paymentStatus: { $ne: 'paid' } },
      { $set: { orderStatus: 'cancelled', cancelledAt: new Date(), 'items.$[].fulfillmentStatus': 'cancelled' }, $inc: { __v: 1 } },
      { new: true },
    );
    if (!order) {
      const existing = await Order.findOne({ _id: req.params.id, customer: req.user._id }).select('orderStatus paymentStatus');
      if (!existing) return res.status(404).json({ message: 'Order not found.' });
      return res.status(409).json({ message: 'This order can no longer be cancelled.' });
    }
    await Promise.all(order.items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.qty } })));
    await publicOrder(order);
    return res.json({ message: 'Order cancelled and stock restored.', order });
  } catch (error) { return next(error); }
});

module.exports = router;
