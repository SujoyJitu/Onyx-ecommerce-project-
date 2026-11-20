const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 300 },
  details: { type: String, trim: true, maxlength: 1500, default: '' },
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'refunded'], default: 'requested', index: true },
  reviewedAt: { type: Date, default: null },
  refundReference: { type: String, default: '' },
}, { timestamps: true });

returnRequestSchema.index({ order: 1, customer: 1 }, { unique: true });
module.exports = mongoose.model('ReturnRequest', returnRequestSchema);
