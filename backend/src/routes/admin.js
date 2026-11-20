const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const CommissionSetting = require('../models/CommissionSetting');
const Coupon = require('../models/Coupon');
const Banner = require('../models/Banner');
const ReturnRequest = require('../models/ReturnRequest');
const { sendOrderEmail } = require('../services/email');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const adminOnly = [authenticate, authorizeRoles('admin')];
const adminLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many admin sign-in attempts. Try again later.' } });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isBlocked: user.isBlocked, createdAt: user.createdAt });

router.post('/login', adminLoginLimiter, async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!email || typeof password !== 'string' || !password) return res.status(400).json({ message: 'Enter your admin email and password.' });
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || user.role !== 'admin' || !await user.comparePassword(password)) return res.status(401).json({ message: 'Invalid admin email or password.' });
    if (user.isBlocked) return res.status(403).json({ message: 'This admin account has been blocked.' });
    if (!user.emailVerified) return res.status(403).json({ message: 'Verify this admin account email before signing in.' });
    const token = jwt.sign({ sub: user._id.toString(), role: user.role, sv: user.sessionVersion || 0 }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    return res.json({ token, user: publicUser(user) });
  } catch (error) { return next(error); }
});

router.use(...adminOnly);

router.get('/returns', async (req, res, next) => {
  try { return res.json({ requests: await ReturnRequest.find().populate('customer', 'name email').populate('order', 'total paymentMethod paymentStatus orderStatus').sort({ createdAt: -1 }) }); }
  catch (error) { return next(error); }
});

router.put('/returns/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id) || !['approved', 'rejected', 'refunded'].includes(req.body?.status)) return res.status(400).json({ message: 'Choose approved, rejected, or refunded.' });
  try {
    const request = await ReturnRequest.findById(req.params.id).populate('customer', 'name email').populate('order');
    if (!request) return res.status(404).json({ message: 'Return request not found.' });
    if (request.status === 'rejected' || request.status === 'refunded') return res.status(409).json({ message: 'This return request is already closed.' });
    if (req.body.status === 'refunded' && request.status !== 'approved') return res.status(409).json({ message: 'Approve a return before marking it refunded.' });
    request.status = req.body.status;
    request.reviewedAt = new Date();
    if (typeof req.body.refundReference === 'string') request.refundReference = req.body.refundReference.trim().slice(0, 120);
    await request.save();
    if (request.status === 'refunded') {
      request.order.paymentStatus = 'refunded';
      await request.order.save();
    }
    if (request.customer?.email) await sendOrderEmail({ to: request.customer.email, subject: `Return request ${request.status}: ${request.order._id}`, text: `Hello ${request.customer.name},\n\nYour return request for order ${request.order._id} is now ${request.status}.${request.refundReference ? ` Refund reference: ${request.refundReference}.` : ''}` }).catch((error) => console.error('Return status email failed:', error.message));
    return res.json({ request });
  } catch (error) { return next(error); }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const [users, vendors, orders, products, commission, sales] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'vendor' }),
      Order.countDocuments(),
      Product.countDocuments(),
      CommissionSetting.findById('global'),
      Order.aggregate([
        { $unwind: '$items' },
        { $match: { 'items.fulfillmentStatus': 'delivered' } },
        { $group: { _id: null, gross: { $sum: { $multiply: ['$items.price', '$items.qty'] } }, revenue: { $sum: '$items.commissionAmount' } } },
      ]),
    ]);
    return res.json({ metrics: { users, vendors, orders, products, grossSales: sales[0]?.gross || 0, revenue: sales[0]?.revenue || 0, commissionRate: commission?.rate || 0 } });
  } catch (error) { return next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const filter = { role: { $in: ['customer', 'vendor'] } };
    if (req.query.q) {
      const escaped = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }];
    }
    const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(filter)]);
    return res.json({ users: users.map(publicUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.put('/users/:id/status', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id) || typeof req.body?.isBlocked !== 'boolean') return res.status(400).json({ message: 'Provide a valid user id and isBlocked boolean.' });
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: { $in: ['customer', 'vendor'] } }, { $set: { isBlocked: req.body.isBlocked } }, { new: true });
    if (!user) return res.status(404).json({ message: 'Customer or vendor not found.' });
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

router.get('/vendors', async (req, res, next) => {
  try {
    const [shops, usersWithoutShop] = await Promise.all([
      Shop.find().populate('owner', 'name email phone isBlocked').sort({ createdAt: -1 }),
      User.find({ role: 'vendor', isBlocked: { $ne: true }, _id: { $nin: await Shop.distinct('owner') } }).select('name email phone createdAt'),
    ]);
    return res.json({ vendors: shops, vendorsWithoutShop: usersWithoutShop });
  } catch (error) { return next(error); }
});

router.put('/vendors/:shopId/status', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.shopId) || !['approved', 'blocked'].includes(req.body?.status)) return res.status(400).json({ message: 'Status must be approved or blocked.' });
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.shopId, { $set: { status: req.body.status } }, { new: true }).populate('owner', 'name email phone');
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    return res.json({ shop });
  } catch (error) { return next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.moderationStatus = req.query.status;
    if (req.query.q) filter.$or = [{ title: { $regex: String(req.query.q), $options: 'i' } }, { brand: { $regex: String(req.query.q), $options: 'i' } }];
    const [products, total] = await Promise.all([
      Product.find(filter).populate('vendor', 'name email').populate('category', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    return res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.put('/products/:id/moderation', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id) || !['visible', 'hidden', 'unsafe'].includes(req.body?.moderationStatus)) return res.status(400).json({ message: 'Moderation status must be visible, hidden, or unsafe.' });
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length > 500) return res.status(400).json({ message: 'Moderation reason must be 500 characters or fewer.' });
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: { moderationStatus: req.body.moderationStatus, moderationReason: reason } }, { new: true }).populate('vendor', 'name email').populate('category', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.json({ product });
  } catch (error) { return next(error); }
});

router.get('/orders', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const [orders, total] = await Promise.all([
      Order.find().populate('customer', 'name email').populate('items.vendor', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(),
    ]);
    return res.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.put('/orders/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order id.' });
  const { paymentStatus, orderStatus } = req.body || {};
  if ((paymentStatus !== undefined && !['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) || (orderStatus !== undefined && !['pending', 'processing', 'shipped', 'delivered'].includes(orderStatus)) || (paymentStatus === undefined && orderStatus === undefined)) {
    return res.status(400).json({ message: 'Provide a valid paymentStatus or orderStatus.' });
  }
  try {
    const current = await Order.findById(req.params.id).select('orderStatus paymentStatus');
    if (!current) return res.status(404).json({ message: 'Order not found.' });
    const rank = { pending: 0, processing: 1, shipped: 2, delivered: 3 };
    if (orderStatus !== undefined && (current.orderStatus === 'cancelled' || rank[orderStatus] < rank[current.orderStatus])) {
      return res.status(409).json({ message: 'A cancelled order cannot be reopened and fulfillment cannot move backwards.' });
    }
    const update = {};
    if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;
    if (orderStatus !== undefined) {
      update.orderStatus = orderStatus;
      update['items.$[].fulfillmentStatus'] = orderStatus;
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).populate('customer', 'name email').populate('items.vendor', 'name email');
    if (orderStatus !== undefined && current.orderStatus !== orderStatus && order.customer?.email) {
      await sendOrderEmail({ to: order.customer.email, subject: `Order update: ${order._id}`, text: `Hello ${order.customer.name},\n\nYour order ${order._id} status is now ${orderStatus}.` }).catch((error) => console.error('Order status email failed:', error.message));
    }
    if (paymentStatus === 'paid' && current.paymentStatus !== 'paid' && order.customer?.email) {
      await sendOrderEmail({ to: order.customer.email, subject: `Payment confirmed: ${order._id}`, text: `Hello ${order.customer.name},\n\nPayment for order ${order._id} has been recorded as paid.` }).catch((error) => console.error('Payment confirmation email failed:', error.message));
    }
    return res.json({ order });
  } catch (error) { return next(error); }
});

router.put('/orders/:id/shipment', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order id.' });
  const { provider, trackingNumber, trackingUrl } = req.body || {};
  if (!['pathao', 'steadfast', 'other'].includes(provider) || typeof trackingNumber !== 'string' || trackingNumber.trim().length > 120 || typeof trackingUrl !== 'string' || trackingUrl.length > 500 || (trackingUrl && !/^https:\/\//i.test(trackingUrl))) return res.status(400).json({ message: 'Provide a courier, tracking number, and a valid HTTPS tracking link.' });
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: { deliveryProvider: provider, trackingNumber: trackingNumber.trim(), trackingUrl: trackingUrl.trim() } }, { new: true, runValidators: true }).populate('customer', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.customer?.email) await sendOrderEmail({ to: order.customer.email, subject: `Shipment information: ${order._id}`, text: `Hello ${order.customer.name},\n\nYour order has shipped with ${provider}. Tracking number: ${trackingNumber.trim()}.${trackingUrl ? ` Track it here: ${trackingUrl}` : ''}` }).catch((error) => console.error('Shipment email failed:', error.message));
    return res.json({ order });
  } catch (error) { return next(error); }
});

router.get('/commission', async (req, res, next) => {
  try { return res.json({ setting: await CommissionSetting.findById('global') || { _id: 'global', rate: 0 } }); }
  catch (error) { return next(error); }
});

router.put('/commission', async (req, res, next) => {
  const rate = Number(req.body?.rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return res.status(400).json({ message: 'Commission rate must be between 0 and 100 percent.' });
  try {
    const setting = await CommissionSetting.findByIdAndUpdate('global', { $set: { rate, updatedBy: req.user._id } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    return res.json({ setting });
  } catch (error) { return next(error); }
});

router.get('/coupons', async (req, res, next) => {
  try { return res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }) }); }
  catch (error) { return next(error); }
});

function validateCouponInput(body) {
  if (body.discountType === 'percent' && Number(body.value) > 100) return 'Percentage discounts cannot exceed 100.';
  if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) return 'End date must be after the start date.';
  return '';
}
const couponFields = ['code', 'discountType', 'value', 'minSubtotal', 'maxDiscount', 'startsAt', 'endsAt', 'usageLimit', 'active'];
const pickFields = (body, fields) => Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));

router.post('/coupons', async (req, res, next) => {
  const input = pickFields(req.body || {}, couponFields);
  const validationError = validateCouponInput(input);
  if (validationError) return res.status(400).json({ message: validationError });
  try { const coupon = await Coupon.create(input); return res.status(201).json({ coupon }); }
  catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'Coupon code already exists.' }); if (error.name === 'ValidationError') return res.status(400).json({ message: error.message }); return next(error); }
});

router.put('/coupons/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid coupon id.' });
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    const input = pickFields(req.body || {}, couponFields);
    const validationError = validateCouponInput({ ...coupon.toObject(), ...input });
    if (validationError) return res.status(400).json({ message: validationError });
    Object.assign(coupon, input);
    await coupon.save();
    return res.json({ coupon });
  }
  catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'Coupon code already exists.' }); if (error.name === 'ValidationError') return res.status(400).json({ message: error.message }); return next(error); }
});

router.delete('/coupons/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid coupon id.' });
  try { const coupon = await Coupon.findByIdAndDelete(req.params.id); if (!coupon) return res.status(404).json({ message: 'Coupon not found.' }); return res.json({ message: 'Coupon deleted.' }); }
  catch (error) { return next(error); }
});

router.get('/banners', async (req, res, next) => {
  try { return res.json({ banners: await Banner.find().sort({ position: 1, createdAt: -1 }) }); }
  catch (error) { return next(error); }
});

router.post('/banners', async (req, res, next) => {
  try { const banner = await Banner.create(pickFields(req.body || {}, ['title', 'subtitle', 'imageUrl', 'linkUrl', 'active', 'position'])); return res.status(201).json({ banner }); }
  catch (error) { if (error.name === 'ValidationError') return res.status(400).json({ message: error.message }); return next(error); }
});

router.put('/banners/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid banner id.' });
  try { const banner = await Banner.findByIdAndUpdate(req.params.id, { $set: pickFields(req.body || {}, ['title', 'subtitle', 'imageUrl', 'linkUrl', 'active', 'position']) }, { new: true, runValidators: true }); if (!banner) return res.status(404).json({ message: 'Banner not found.' }); return res.json({ banner }); }
  catch (error) { if (error.name === 'ValidationError') return res.status(400).json({ message: error.message }); return next(error); }
});

router.delete('/banners/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid banner id.' });
  try { const banner = await Banner.findByIdAndDelete(req.params.id); if (!banner) return res.status(404).json({ message: 'Banner not found.' }); return res.json({ message: 'Banner deleted.' }); }
  catch (error) { return next(error); }
});

module.exports = router;
