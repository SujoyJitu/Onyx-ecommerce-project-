const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CommissionSetting = require('../models/CommissionSetting');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const { getCouponDiscount } = require('../services/coupons');
const ReturnRequest = require('../models/ReturnRequest');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const customerOnly = [authenticate, authorizeRoles('customer')];
const vendorOnly = [authenticate, authorizeRoles('vendor')];
const paymentMethods = new Set(['cash_on_delivery', 'sslcommerz']);
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
  const couponCode = typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase() : '';
  if (!paymentMethods.has(paymentMethod)) return res.status(400).json({ message: 'Choose cash on delivery or SSLCommerz.' });
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
  let reservedCouponId = null;
  try {
    const lines = [];
    const commission = await CommissionSetting.findById('global');
    const commissionRate = commission?.rate || 0;
    for (const [productId, qty] of quantities) {
      const product = await Product.findOneAndUpdate(
        { _id: productId, status: 'active', moderationStatus: 'visible', stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true },
      );
      if (!product) {
        const exists = await Product.exists({ _id: productId, status: 'active' });
        const reason = exists ? 'Requested quantity exceeds available stock.' : 'A requested product is unavailable.';
        const error = Object.assign(new Error(reason), { statusCode: 409 });
        throw error;
      }
      if (!await Shop.exists({ owner: product.vendor, status: 'approved' })) {
        throw Object.assign(new Error('A requested product is unavailable.'), { statusCode: 409 });
      }
      if (await User.exists({ _id: product.vendor, isBlocked: true })) throw Object.assign(new Error('A requested product is unavailable.'), { statusCode: 409 });
      reservations.push({ productId: product._id, qty });
      lines.push({
        product: product._id,
        vendor: product.vendor,
        qty,
        price: product.discountPrice ?? product.price,
        commissionRate,
        commissionAmount: Math.round((product.discountPrice ?? product.price) * qty * commissionRate) / 100,
        vendorEarning: Math.round((product.discountPrice ?? product.price) * qty * (100 - commissionRate)) / 100,
        title: product.title,
        image: product.images?.[0]?.url || '',
      });
    }

    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100;
    const { coupon, discount } = await getCouponDiscount(couponCode, subtotal);
    if (coupon) {
      const now = new Date();
      const eligibility = { _id: coupon._id, active: true, $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        { $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }] },
      ] };
      const incremented = await Coupon.findOneAndUpdate(eligibility, { $inc: { usageCount: 1 } }, { new: true });
      if (!incremented) throw Object.assign(new Error('That coupon has just expired or reached its usage limit.'), { statusCode: 409 });
      reservedCouponId = coupon._id;
      for (const line of lines) {
        const share = discount * (line.price * line.qty / subtotal);
        const net = Math.max(0, line.price * line.qty - share);
        line.commissionAmount = Math.round(net * line.commissionRate) / 100;
        line.vendorEarning = Math.round(net * (100 - line.commissionRate)) / 100;
      }
    }
    const total = Math.round((subtotal - discount) * 100) / 100;
    const order = await Order.create({ customer: req.user._id, items: lines, address, paymentMethod, subtotal, coupon: coupon?._id || null, couponCode: coupon?.code || '', couponDiscount: discount, total });
    createdOrder = order;
    if (cart) {
      await Cart.updateOne({ _id: cart._id }, { $pull: { items: { product: { $in: lines.map((line) => line.product) } } } }).catch(() => {});
    }
    await publicOrder(order);
    if (paymentMethod === 'cash_on_delivery') {
      const customer = await User.findById(req.user._id).select('name email');
      if (customer?.email) {
        const { sendOrderEmail } = require('../services/email');
        await sendOrderEmail({ to: customer.email, subject: `Order received: ${order._id}`, text: `Hello ${customer.name},\n\nWe received your cash on delivery order ${order._id}. Total: ${order.total}. You can view its status from My Orders.` }).catch((error) => console.error('Order email failed:', error.message));
      }
    }
    return res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    if (createdOrder) {
      return res.status(201).json({ message: 'Order placed successfully.', order: createdOrder });
    }
    await Promise.allSettled(reservations.map(({ productId, qty }) => Product.updateOne({ _id: productId }, { $inc: { stock: qty } })));
    if (reservedCouponId) await Coupon.updateOne({ _id: reservedCouponId, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
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

router.get('/returns/my', ...customerOnly, async (req, res, next) => {
  try { return res.json({ requests: await ReturnRequest.find({ customer: req.user._id }).populate('order', 'total orderStatus paymentStatus createdAt').sort({ createdAt: -1 }) }); }
  catch (error) { return next(error); }
});

router.post('/:id/returns', ...customerOnly, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order id.' });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  const details = typeof req.body?.details === 'string' ? req.body.details.trim() : '';
  if (reason.length < 3 || reason.length > 300 || details.length > 1500) return res.status(400).json({ message: 'Enter a return reason (3–300 characters); details can be up to 1,500 characters.' });
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.orderStatus !== 'delivered') return res.status(409).json({ message: 'Return requests are available after delivery.' });
    const request = await ReturnRequest.create({ order: order._id, customer: req.user._id, reason, details });
    return res.status(201).json({ request });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A return request already exists for this order.' });
    return next(error);
  }
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
    if (order.customer?.email) {
      const { sendOrderEmail } = require('../services/email');
      await sendOrderEmail({ to: order.customer.email, subject: `Order update: ${order._id}`, text: `Hello ${order.customer.name},\n\nYour order ${order._id} status is now ${order.orderStatus}.` }).catch((error) => console.error('Order status email failed:', error.message));
    }
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
    if (order.coupon) await Coupon.updateOne({ _id: order.coupon, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
    await publicOrder(order);
    if (order.customer?.email) {
      const { sendOrderEmail } = require('../services/email');
      await sendOrderEmail({ to: order.customer.email, subject: `Order cancelled: ${order._id}`, text: `Hello ${order.customer.name},\n\nYour order ${order._id} was cancelled and reserved stock was released.` }).catch((error) => console.error('Order cancellation email failed:', error.message));
    }
    return res.json({ message: 'Order cancelled and stock restored.', order });
  } catch (error) { return next(error); }
});

module.exports = router;
