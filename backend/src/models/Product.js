const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
}, { _id: false });

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0, default: null },
  stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  images: { type: [productImageSchema], default: [] },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  brand: { type: String, trim: true, maxlength: 100, default: '' },
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active', index: true },
  moderationStatus: { type: String, enum: ['visible', 'hidden', 'unsafe'], default: 'visible', index: true },
  moderationReason: { type: String, trim: true, maxlength: 500, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

productSchema.pre('validate', function validateDiscountPrice() {
  if (this.discountPrice !== null && this.discountPrice !== undefined && this.discountPrice > this.price) {
    this.invalidate('discountPrice', 'Discount price cannot be higher than the regular price.');
  }
});

productSchema.index({ title: 'text', description: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
