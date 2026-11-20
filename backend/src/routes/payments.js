const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { startPayment, verifyPayment } = require('../services/sslcommerz');

const router = express.Router();
const customerOnly = [authenticate, authorizeRoles('customer')];
const providerParser = express.urlencoded({ extended: false });
const frontend = () => process.env.FRONTEND_URL || 'http://localhost:5173';

router.post('/sslcommerz/:orderId', ...customerOnly, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Invalid order id.' });
  try {
    const order = await Order.findOne({ _id: req.params.orderId, customer: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    let url;
    try { url = await startPayment(order, req.user); }
    catch (error) { await releaseUnpaidOrder(order); throw error; }
    return res.json({ paymentUrl: url });
  } catch (error) { return next(error); }
});

async function releaseUnpaidOrder(order) {
  const cancelled = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $in: ['pending', 'failed'] }, orderStatus: { $ne: 'cancelled' } },
    { $set: { paymentStatus: 'failed', orderStatus: 'cancelled', cancelledAt: new Date(), 'items.$[].fulfillmentStatus': 'cancelled' }, $inc: { __v: 1 } },
    { new: true },
  );
  if (cancelled) await Promise.all(cancelled.items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.qty } })));
  return cancelled;
}

async function callback(req, res, status) {
  try {
    const payload = req.body || {};
    const order = await Order.findOne({ gatewayTransactionId: payload.tran_id, paymentMethod: 'sslcommerz' });
    if (!order) return res.redirect(`${frontend()}/payment/result?status=failed`);
    if (status === 'success') {
      const verified = await verifyPayment(payload);
      return res.redirect(`${frontend()}/payment/result?status=${verified ? 'success' : 'failed'}&orderId=${order._id}`);
    }
    await releaseUnpaidOrder(order);
    return res.redirect(`${frontend()}/payment/result?status=${status}&orderId=${order._id}`);
  } catch (error) {
    console.error('SSLCommerz callback failed:', error.message);
    return res.redirect(`${frontend()}/payment/result?status=failed`);
  }
}

router.post('/sslcommerz/success', providerParser, (req, res) => callback(req, res, 'success'));
router.post('/sslcommerz/fail', providerParser, (req, res) => callback(req, res, 'failed'));
router.post('/sslcommerz/cancel', providerParser, (req, res) => callback(req, res, 'cancelled'));
router.post('/sslcommerz/ipn', providerParser, async (req, res) => {
  try { await verifyPayment(req.body || {}); return res.status(200).send('OK'); }
  catch (error) { console.error('SSLCommerz IPN failed:', error.message); return res.status(503).send('Retry'); }
});

router.get('/sslcommerz/status/:orderId', ...customerOnly, async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Invalid order id.' });
  try {
    const order = await Order.findOne({ _id: req.params.orderId, customer: req.user._id }).select('paymentStatus orderStatus');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    return res.json({ paymentStatus: order.paymentStatus, orderStatus: order.orderStatus });
  } catch (error) { return next(error); }
});

module.exports = router;
