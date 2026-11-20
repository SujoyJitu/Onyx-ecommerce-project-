const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const Order = require('../models/Order');
const PayoutRequest = require('../models/PayoutRequest');

const router = express.Router();
router.use(authenticate, authorizeRoles('vendor'));

async function earningsFor(vendorId) {
  const orders = await Order.find({ 'items.vendor': vendorId }).select('items');
  let earned = 0;
  for (const order of orders) {
    for (const item of order.items) {
      if (item.vendor.toString() === vendorId.toString() && item.fulfillmentStatus === 'delivered') {
        earned += item.commissionRate === 0 ? item.price * item.qty : item.vendorEarning;
      }
    }
  }
  const payoutRequests = await PayoutRequest.find({ vendor: vendorId }).sort({ createdAt: -1 });
  const reserved = payoutRequests.filter((request) => ['pending', 'approved'].includes(request.status)).reduce((sum, request) => sum + request.amount, 0);
  return { earned: Math.round(earned * 100) / 100, reserved: Math.round(reserved * 100) / 100, available: Math.max(0, Math.round((earned - reserved) * 100) / 100), payoutRequests };
}

router.get('/my', async (req, res, next) => {
  try {
    const earnings = await earningsFor(req.user._id);
    return res.json(earnings);
  } catch (error) { return next(error); }
});

router.post('/', async (req, res, next) => {
  const amount = Number(req.body?.amount);
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  if (!Number.isFinite(amount) || amount <= 0 || note.length > 500) return res.status(400).json({ message: 'Enter a positive payout amount and a note of 500 characters or fewer.' });
  try {
    const earnings = await earningsFor(req.user._id);
    if (amount > earnings.available) return res.status(400).json({ message: 'Payout amount exceeds your available delivered-order earnings.' });
    const payoutRequest = await PayoutRequest.create({ vendor: req.user._id, amount: Math.round(amount * 100) / 100, note });
    const updatedEarnings = await earningsFor(req.user._id);
    return res.status(201).json({ message: 'Payout request submitted for review.', payoutRequest, ...updatedEarnings });
  } catch (error) { return next(error); }
});

router.delete('/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid payout request id.' });
  try {
    const payoutRequest = await PayoutRequest.findOneAndDelete({ _id: req.params.id, vendor: req.user._id, status: 'pending' });
    if (!payoutRequest) return res.status(404).json({ message: 'Pending payout request not found.' });
    return res.json({ message: 'Payout request withdrawn.' });
  } catch (error) { return next(error); }
});

module.exports = router;
