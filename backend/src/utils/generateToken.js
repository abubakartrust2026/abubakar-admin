import jwt from 'jsonwebtoken';

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @returns {string} - JWT token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30m',
  });
};

/**
 * Generate JWT refresh token
 * @param {string} userId - User ID
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 * @returns {object} - Decoded token payload
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} - Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
