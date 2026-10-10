import asyncHandler from 'express-async-handler';
import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../models/User.js';

// Routes usable while a temporary password is still in place
const PASSWORD_CHANGE_EXEMPT = ['/api/auth/change-password', '/api/auth/me', '/api/auth/logout'];

/**
 * Protect routes - Verify JWT token
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];

    try {
      const decoded = verifyAccessToken(token);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }

    if (!req.user) {
      res.status(401);
      throw new Error('User not found');
    }

    if (!req.user.isActive) {
      res.status(401);
      throw new Error('User account is not active');
    }

    // A parent holding an admin-issued temporary password must set their own first
    if (req.user.mustChangePassword && !PASSWORD_CHANGE_EXEMPT.some((p) => req.originalUrl.startsWith(p))) {
      res.status(403);
      const err = new Error('You must change your temporary password before continuing');
      err.code = 'PASSWORD_CHANGE_REQUIRED';
      throw err;
    }

    return next();
  }

  res.status(401);
  throw new Error('Not authorized, no token');
});

/**
 * Check if user has required role(s)
 * @param {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`User role '${req.user.role}' is not authorized to access this route`);
    }

    next();
  };
};
