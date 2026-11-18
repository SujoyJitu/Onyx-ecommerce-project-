const express = require('express');
const Category = require('../models/Category');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().select('name slug image').sort({ name: 1 });
    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
