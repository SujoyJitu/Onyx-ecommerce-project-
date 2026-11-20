const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
