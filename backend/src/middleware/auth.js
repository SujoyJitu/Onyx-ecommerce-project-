const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required. Send a Bearer token.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Invalid authentication token.' });
    if (user.isBlocked) return res.status(403).json({ message: 'This account has been blocked. Contact support for help.' });
    if (!user.emailVerified) return res.status(403).json({ message: 'Please verify your email address before continuing.' });
    if ((payload.sv || 0) !== (user.sessionVersion || 0)) return res.status(401).json({ message: 'This session is no longer valid. Please sign in again.' });
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }
    return next(error);
  }
}

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to access this resource.' });
  }
  return next();
};

module.exports = {
  authenticate,
  authorizeRoles,
  isVendor: authorizeRoles('vendor', 'admin'),
  isAdmin: authorizeRoles('admin'),
};
