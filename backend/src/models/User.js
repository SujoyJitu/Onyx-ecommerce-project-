const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: [2, 'Name must be at least 2 characters'] },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  password: { type: String, required() { return !this.googleId; }, minlength: [8, 'Password must be at least 8 characters'], select: false },
  role: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'customer' },
  emailVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String, select: false },
  verificationExpires: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  googleId: { type: String, unique: true, sparse: true, select: false },
  sessionVersion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
