const Coupon = require('../models/Coupon');

async function getCouponDiscount(code, subtotal) {
  if (!code) return { coupon: null, discount: 0 };
  const now = new Date();
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase(), active: true, $and: [
    { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
    { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    { $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }] },
  ] });
  if (!coupon || subtotal < coupon.minSubtotal) throw Object.assign(new Error('That coupon is invalid, expired, or the order does not meet its minimum subtotal.'), { statusCode: 400 });
  let discount = coupon.discountType === 'percent' ? subtotal * coupon.value / 100 : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.round(Math.min(subtotal, discount) * 100) / 100;
  return { coupon, discount };
}

module.exports = { getCouponDiscount };
