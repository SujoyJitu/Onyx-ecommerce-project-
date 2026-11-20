const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  qty: { type: Number, required: true, min: 1, validate: Number.isInteger },
  price: { type: Number, required: true, min: 0 },
  title: { type: String, required: true },
  image: { type: String, default: '' },
  fulfillmentStatus: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  recipientName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 40 },
  street: { type: String, required: true, trim: true, maxlength: 240 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  region: { type: String, trim: true, maxlength: 100, default: '' },
  postalCode: { type: String, required: true, trim: true, maxlength: 24 },
  country: { type: String, required: true, trim: true, maxlength: 100 },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true, validate: (items) => items.length > 0 },
  address: { type: addressSchema, required: true },
  paymentMethod: { type: String, enum: ['cash_on_delivery', 'card', 'bank_transfer'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
  orderStatus: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending', index: true },
  total: { type: Number, required: true, min: 0 },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true });

orderSchema.index({ 'items.vendor': 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
