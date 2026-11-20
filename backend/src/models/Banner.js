const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  subtitle: { type: String, trim: true, maxlength: 300, default: '' },
  imageUrl: { type: String, required: true, trim: true, maxlength: 2000, match: /^https?:\/\//i },
  linkUrl: { type: String, trim: true, maxlength: 1000, default: '/shop', match: /^\/(?!\/)/ },
  active: { type: Boolean, default: true, index: true },
  position: { type: Number, min: 0, validate: Number.isInteger, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
