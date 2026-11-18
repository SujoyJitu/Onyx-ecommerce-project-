const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { sendAuthEmail } = require('../services/email');

const router = express.Router();
const recoveryLimiter = () => rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many requests. Please wait 15 minutes and try again.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please wait 15 minutes and try again.' } });
const registerLimiter = recoveryLimiter();
const verifyLimiter = recoveryLimiter();
const resendLimiter = recoveryLimiter();
const forgotLimiter = recoveryLimiter();
const resetLimiter = recoveryLimiter();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const createToken = () => crypto.randomBytes(32).toString('hex');
const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
});

function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, sv: user.sessionVersion || 0 }, process.env.JWT_SECRET, {
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

router.post('/register', registerLimiter, async (req, res, next) => {
  const errors = validateRegister(req.body || {});
  if (errors.length) return res.status(400).json({ message: 'Please correct the input and try again.', errors });

  try {
    const email = req.body.email.trim().toLowerCase();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.emailVerified) return res.status(409).json({ message: 'An account with this email already exists.' });
      const rawToken = createToken();
      existingUser.verificationTokenHash = tokenHash(rawToken);
      existingUser.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await existingUser.save();
      const url = `${frontendUrl()}/verify-email?token=${rawToken}`;
      const developmentUrl = await sendAuthEmail({ to: email, subject: 'Verify your ONYX email', text: `Verify your email: ${url}`, html: `<p>Verify your ONYX email address.</p><p><a href="${url}">Verify email</a> (link expires in 24 hours)</p>`, developmentUrl: url });
      return res.status(200).json({ message: 'This account is awaiting verification. We sent a new verification link.', ...(developmentUrl ? { developmentVerificationUrl: developmentUrl } : {}) });
    }

    const verificationToken = createToken();
    const user = await User.create({
      name: req.body.name.trim(),
      email,
      phone: req.body.phone.trim(),
      password: req.body.password,
      role: req.body.role || 'customer',
      verificationTokenHash: tokenHash(verificationToken),
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const url = `${frontendUrl()}/verify-email?token=${verificationToken}`;
    const developmentUrl = await sendAuthEmail({ to: email, subject: 'Verify your ONYX email', text: `Verify your email: ${url}`, html: `<p>Verify your ONYX email address.</p><p><a href="${url}">Verify email</a> (link expires in 24 hours)</p>`, developmentUrl: url });
    return res.status(201).json({ message: 'Account created. Check your email for a verification link.', user: publicUser(user), ...(developmentUrl ? { developmentVerificationUrl: developmentUrl } : {}) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please correct the input and try again.', errors: Object.values(error.errors).map(({ path, message }) => ({ field: path, message })) });
    }
    return next(error);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
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
    if (!user.emailVerified) return res.status(403).json({ message: 'Please verify your email address before signing in.' });
    return res.json({ message: 'Login successful.', token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/verify-email', verifyLimiter, async (req, res, next) => {
  const { token } = req.body || {};
  if (typeof token !== 'string' || token.length !== 64) return res.status(400).json({ message: 'A valid verification token is required.' });
  try {
    const user = await User.findOne({ verificationTokenHash: tokenHash(token), verificationExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'This verification link is invalid or expired. Request a new one and try again.' });
    user.emailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationExpires = undefined;
    await user.save();
    return res.json({ message: 'Email verified successfully.', token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/resend-verification', resendLimiter, async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  try {
    const user = await User.findOne({ email });
    if (user && !user.emailVerified) {
      const rawToken = createToken();
      user.verificationTokenHash = tokenHash(rawToken);
      user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      const url = `${frontendUrl()}/verify-email?token=${rawToken}`;
      const developmentUrl = await sendAuthEmail({ to: email, subject: 'Verify your ONYX email', text: `Verify your email: ${url}`, html: `<p>Verify your ONYX email address.</p><p><a href="${url}">Verify email</a> (link expires in 24 hours)</p>`, developmentUrl: url });
      return res.json({ message: 'If that address has an unverified account, a new verification link has been sent.', ...(developmentUrl ? { developmentVerificationUrl: developmentUrl } : {}) });
    }
    return res.json({ message: 'If that address has an unverified account, a new verification link has been sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', forgotLimiter, async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  try {
    const user = await User.findOne({ email });
    if (user) {
      const rawToken = createToken();
      user.passwordResetTokenHash = tokenHash(rawToken);
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      const url = `${frontendUrl()}/reset-password?token=${rawToken}`;
      const developmentUrl = await sendAuthEmail({ to: email, subject: 'Reset your ONYX password', text: `Reset your password: ${url}`, html: `<p>A password reset was requested for your ONYX account.</p><p><a href="${url}">Reset password</a> (link expires in 15 minutes)</p><p>If you did not request this, you can ignore this email.</p>`, developmentUrl: url });
      return res.json({ message: 'If an account exists for that address, a password reset link has been sent.', ...(developmentUrl ? { developmentResetUrl: developmentUrl } : {}) });
    }
    return res.json({ message: 'If an account exists for that address, a password reset link has been sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', resetLimiter, async (req, res, next) => {
  const { token, password } = req.body || {};
  const errors = [];
  if (typeof token !== 'string' || token.length !== 64) errors.push({ field: 'token', message: 'The reset link is invalid or incomplete.' });
  if (typeof password !== 'string' || password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  if (errors.length) return res.status(400).json({ message: 'Please correct the input and try again.', errors });
  try {
    const user = await User.findOne({ passwordResetTokenHash: tokenHash(token), passwordResetExpires: { $gt: new Date() } }).select('+password');
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one and try again.' });
    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    return res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/google', loginLimiter, async (req, res, next) => {
  const { credential } = req.body || {};
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ message: 'Google sign-in is not configured yet.' });
  if (typeof credential !== 'string' || !credential) return res.status(400).json({ message: 'A Google ID credential is required.' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true) {
      return res.status(401).json({ message: 'Google did not provide a verified email address.' });
    }

    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email: profile.email.toLowerCase() }] }).select('+googleId +password');
    if (user && user.googleId && user.googleId !== profile.sub) {
      return res.status(409).json({ message: 'This email is linked to a different Google account.' });
    }
    if (!user) {
      user = new User({ name: profile.name || profile.email.split('@')[0], email: profile.email.toLowerCase(), emailVerified: true, googleId: profile.sub, phone: '' });
    } else {
      user.googleId = profile.sub;
      user.emailVerified = true;
    }
    await user.save();
    return res.json({ message: 'Google sign-in successful.', token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.name === 'Error' || error.message?.toLowerCase().includes('token')) {
      return res.status(401).json({ message: 'Google credential is invalid or expired.' });
    }
    return next(error);
  }
});

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
