const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorizeRoles('customer', 'vendor'));
const participantFilter = (user) => user.role === 'customer' ? { customer: user._id } : { vendor: user._id };

router.get('/threads', async (req, res, next) => {
  try {
    const conversations = await Conversation.find(participantFilter(req.user)).populate('customer', 'name photo').populate('vendor', 'name photo').populate('product', 'title images').sort({ updatedAt: -1 }).limit(100);
    return res.json({ conversations });
  } catch (error) { return next(error); }
});

router.post('/threads', authorizeRoles('customer'), async (req, res, next) => {
  const productId = req.body?.productId;
  if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: 'Choose a valid product.' });
  try {
    const product = await Product.findOne({ _id: productId, status: 'active', moderationStatus: 'visible' });
    if (!product || !await Shop.exists({ owner: product.vendor, status: 'approved' })) return res.status(404).json({ message: 'Product seller not found.' });
    const conversation = await Conversation.findOneAndUpdate(
      { customer: req.user._id, vendor: product.vendor },
      { $setOnInsert: { customer: req.user._id, vendor: product.vendor, product: product._id, messages: [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate('customer', 'name photo').populate('vendor', 'name photo').populate('product', 'title images');
    return res.status(200).json({ conversation });
  } catch (error) { return next(error); }
});

router.get('/threads/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid conversation id.' });
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, ...participantFilter(req.user) }).populate('customer', 'name photo').populate('vendor', 'name photo').populate('product', 'title images');
    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    const unread = conversation.messages.filter((message) => message.sender.toString() !== req.user._id.toString() && !message.readAt);
    if (unread.length) { unread.forEach((message) => { message.readAt = new Date(); }); await conversation.save(); }
    return res.json({ conversation });
  } catch (error) { return next(error); }
});

router.post('/threads/:id/messages', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid conversation id.' });
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 2000) return res.status(400).json({ message: 'Messages must contain 1 to 2,000 characters.' });
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, ...participantFilter(req.user) });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
    conversation.messages.push({ sender: req.user._id, body });
    conversation.updatedAt = new Date();
    await conversation.save();
    return res.status(201).json({ message: conversation.messages.at(-1) });
  } catch (error) { return next(error); }
});
module.exports = router;
