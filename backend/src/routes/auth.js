const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});

function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function validateRegister(body) {
  const errors = [];
  if (typeof body.name !== 'string' || body.name.trim().length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters.' });
  if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim())) errors.push({ field: 'email', message: 'Enter a valid email address.' });
  if (typeof body.phone !== 'string' || body.phone.trim().length < 7) errors.push({ field: 'phone', message: 'Enter a valid phone number.' });
  if (typeof body.password !== 'string' || body.password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  if (body.role !== undefined && !['customer', 'vendor'].includes(body.role)) {
    errors.push({ field: 'role', message: 'Role must be customer or vendor. Admin accounts must be created by an administrator.' });
  }
  return errors;
}

router.post('/register', async (req, res, next) => {
  const errors = validateRegister(req.body || {});
  if (errors.length) return res.status(400).json({ message: 'Please correct the input and try again.', errors });

  try {
    const email = req.body.email.trim().toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = await User.create({
      name: req.body.name.trim(),
      email,
      phone: req.body.phone.trim(),
      password: req.body.password,
      role: req.body.role || 'customer',
    });
    return res.status(201).json({ message: 'Account created successfully.', user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please correct the input and try again.', errors: Object.values(error.errors).map(({ path, message }) => ({ field: path, message })) });
    }
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];
  if (typeof email !== 'string' || !emailPattern.test(email.trim())) errors.push({ field: 'email', message: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length === 0) errors.push({ field: 'password', message: 'Password is required.' });
  if (errors.length) return res.status(400).json({ message: 'Please correct the input and try again.', errors });

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    return res.json({ message: 'Login successful.', token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
