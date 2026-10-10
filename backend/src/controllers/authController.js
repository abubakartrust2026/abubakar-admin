import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Student from '../models/Student.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateToken.js';

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Check if user exists (include password for comparison)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    res.status(401);
    throw new Error('User account is not active');
  }

  // Verify password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Parents sign in through the parent portal (admission number), not the admin login
  if (user.role === 'parent') {
    res.status(403);
    throw new Error('Parents should sign in from the Parent Login page');
  }

  // Generate tokens
  const token = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Send response
  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: user.toPublicJSON(),
    token,
    refreshToken,
  });
});

/**
 * @desc    Parent login with a child's admission number
 * @route   POST /api/auth/parent-login
 * @access  Public
 */
export const parentLogin = asyncHandler(async (req, res) => {
  const admissionNumber = String(req.body.admissionNumber || '').trim();
  const password = req.body.password;

  if (!admissionNumber || !password) {
    res.status(400);
    throw new Error('Please provide admission number and password');
  }

  // Every failure below returns the same message so admission numbers can't be probed
  const invalid = () => {
    res.status(401);
    return new Error('Invalid admission number or password');
  };

  const student = await Student.findOne({ admissionNumber });
  if (!student || !student.parent) throw invalid();

  const user = await User.findById(student.parent).select('+password');
  if (!user || user.role !== 'parent' || !user.isActive) throw invalid();

  if (!(await user.comparePassword(String(password)))) throw invalid();

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: user.toPublicJSON(),
    token: generateAccessToken(user._id),
    refreshToken: generateRefreshToken(user._id),
  });
});

/**
 * @desc    Change own password (clears the temporary-password flag)
 * @route   POST /api/auth/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide current and new password');
  }
  if (String(newPassword).length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters');
  }
  if (newPassword === currentPassword) {
    res.status(400);
    throw new Error('New password must be different from the current password');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(String(currentPassword)))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = String(newPassword); // hashed by the pre-save hook
  user.mustChangePassword = false;
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully', user: user.toPublicJSON() });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400);
    throw new Error('Refresh token is required');
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      res.status(401);
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const newToken = generateAccessToken(user._id);

    res.status(200).json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }
});

/**
 * @desc    Get current user info
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('children');

  res.status(200).json({
    success: true,
    user: user.toPublicJSON(),
  });
});

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});
