const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { getCouponDiscount } = require('../services/coupons');

const router = express.Router();
router.post('/validate', authenticate, authorizeRoles('customer'), async (req, res, next) => {
  const subtotal = Number(req.body?.subtotal);
  if (!Number.isFinite(subtotal) || subtotal < 0 || typeof req.body?.code !== 'string') return res.status(400).json({ message: 'Enter a coupon code and valid subtotal.' });
  try {
    const { coupon, discount } = await getCouponDiscount(req.body.code, subtotal);
    return res.json({ code: coupon.code, discount, total: Math.round((subtotal - discount) * 100) / 100 });
  } catch (error) { return next(error); }
});
module.exports = router;
