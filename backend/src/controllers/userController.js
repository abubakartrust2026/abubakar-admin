import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Student from '../models/Student.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 10 } = req.query;
  const query = {};

  if (role) query.role = role;
  if (search) {
    const searchRegex = escapeRegex(search);
    query.$or = [
      { firstName: { $regex: searchRegex, $options: 'i' } },
      { lastName: { $regex: searchRegex, $options: 'i' } },
      { email: { $regex: searchRegex, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .populate('children', 'firstName lastName class admissionNumber')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('children');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user.toPublicJSON(),
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Don't allow password update through this route
  delete req.body.password;

  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.role === 'parent') {
    const hasStudents = await Student.exists({ parent: user._id });
    if (hasStudents) {
      res.status(400);
      throw new Error('Cannot delete parent with linked students. Reassign or delete students first.');
    }
  }

  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

// @desc    Get all parent users
// @route   GET /api/users/parents
// @access  Private/Admin
export const getParents = asyncHandler(async (req, res) => {
  const parents = await User.find({ role: 'parent' })
    .populate('children', 'firstName lastName class admissionNumber')
    .sort({ firstName: 1 });

  res.status(200).json({ success: true, data: parents });
});