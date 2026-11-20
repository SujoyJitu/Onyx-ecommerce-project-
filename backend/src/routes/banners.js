const express = require('express');
const Banner = require('../models/Banner');

const router = express.Router();
router.get('/', async (req, res, next) => {
  try { return res.json({ banners: await Banner.find({ active: true }).sort({ position: 1, createdAt: -1 }).select('title subtitle imageUrl linkUrl position') }); }
  catch (error) { return next(error); }
});
module.exports = router;
