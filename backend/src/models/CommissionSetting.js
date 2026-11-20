const mongoose = require('mongoose');

const commissionSettingSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  rate: { type: Number, required: true, min: 0, max: 100, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('CommissionSetting', commissionSettingSchema);
