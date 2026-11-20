const express = require('express');
const Shop = require('../models/Shop');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const uploadLogo = require('../middleware/shopUpload');
const { uploadImageBuffer, deleteImages } = require('../services/cloudinary');

const router = express.Router();
const vendorOnly = [authenticate, authorizeRoles('vendor')];

router.get('/my', ...vendorOnly, async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    return res.json({ shop });
  } catch (error) {
    return next(error);
  }
});

router.post('/', ...vendorOnly, uploadLogo, async (req, res, next) => {
  const shopName = typeof req.body?.shopName === 'string' ? req.body.shopName.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
  const errors = [];
  if (shopName.length < 2 || shopName.length > 100) errors.push({ field: 'shopName', message: 'Shop name must be 2 to 100 characters.' });
  if (description.length > 2000) errors.push({ field: 'description', message: 'Description must be 2,000 characters or fewer.' });
  if (address.length > 500) errors.push({ field: 'address', message: 'Address must be 500 characters or fewer.' });
  if (errors.length) return res.status(400).json({ message: 'Please correct the shop details.', errors });

  try {
    if (await Shop.exists({ owner: req.user._id })) return res.status(409).json({ message: 'You already have a shop.' });
    if (await Shop.exists({ shopName })) return res.status(409).json({ message: 'That shop name is already in use.' });
    const logo = req.file ? await uploadImageBuffer(req.file.buffer, { folder: 'onyx/shops' }) : null;
    try {
      const shop = await Shop.create({ owner: req.user._id, shopName, description, address, logo: logo?.url || '', logoPublicId: logo?.publicId || '', status: 'pending' });
      return res.status(201).json({ message: 'Shop created and submitted for review.', shop });
    } catch (error) {
      if (logo) await deleteImages([logo]);
      if (error.code === 11000) return res.status(409).json({ message: 'You already have a shop or that shop name is already in use.' });
      throw error;
    }
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    return next(error);
  }
});

router.put('/my', ...vendorOnly, uploadLogo, async (req, res, next) => {
  const body = req.body || {};
  const shopName = typeof body.shopName === 'string' ? body.shopName.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const errors = [];
  if (shopName.length < 2 || shopName.length > 100) errors.push({ field: 'shopName', message: 'Shop name must be 2 to 100 characters.' });
  if (description.length > 2000) errors.push({ field: 'description', message: 'Description must be 2,000 characters or fewer.' });
  if (address.length > 500) errors.push({ field: 'address', message: 'Address must be 500 characters or fewer.' });
  if (errors.length) return res.status(400).json({ message: 'Please correct the shop details.', errors });
  let uploaded;
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: 'Create your shop before editing its profile.' });
    if (await Shop.exists({ _id: { $ne: shop._id }, shopName })) return res.status(409).json({ message: 'That shop name is already in use.' });
    const oldLogo = shop.logoPublicId ? [{ publicId: shop.logoPublicId }] : [];
    if (req.file) {
      uploaded = await uploadImageBuffer(req.file.buffer, { folder: 'onyx/shops' });
      shop.logo = uploaded.url;
      shop.logoPublicId = uploaded.publicId;
    } else if (body.removeLogo === 'true') {
      shop.logo = '';
      shop.logoPublicId = '';
    }
    shop.shopName = shopName;
    shop.description = description;
    shop.address = address;
    await shop.save();
    if (uploaded || body.removeLogo === 'true') await deleteImages(oldLogo);
    return res.json({ message: 'Shop profile updated.', shop });
  } catch (error) {
    if (uploaded) await deleteImages([uploaded]);
    if (error.code === 11000) return res.status(409).json({ message: 'That shop name is already in use.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    return next(error);
  }
});

module.exports = router;
