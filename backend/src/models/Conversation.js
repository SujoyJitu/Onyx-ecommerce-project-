const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date, default: null },
});
const conversationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  messages: { type: [messageSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
conversationSchema.index({ customer: 1, vendor: 1 }, { unique: true });
module.exports = mongoose.model('Conversation', conversationSchema);
