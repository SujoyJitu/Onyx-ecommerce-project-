const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  shopName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100, unique: true },
  logo: { type: String, default: '' },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  address: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'pending', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
