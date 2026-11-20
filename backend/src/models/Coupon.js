const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true, minlength: 3, maxlength: 40, unique: true },
  discountType: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0.01 },
  minSubtotal: { type: Number, min: 0, default: 0 },
  maxDiscount: { type: Number, min: 0, default: null },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  usageLimit: { type: Number, min: 1, validate: Number.isInteger, default: null },
  usageCount: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

couponSchema.pre('validate', function validateCoupon() {
  if (this.discountType === 'percent' && this.value > 100) this.invalidate('value', 'Percentage discounts cannot exceed 100.');
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) this.invalidate('endsAt', 'End date must be after the start date.');
});

module.exports = mongoose.model('Coupon', couponSchema);
