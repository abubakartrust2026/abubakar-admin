import asyncHandler from 'express-async-handler';
import { logAudit, snapshot, diffSnapshots } from '../utils/audit.js';
import { escapeRegex, parsePagination } from '../utils/queryHelpers.js';
import User from '../models/User.js';
import Student from '../models/Student.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 10);
  const query = {};

  if (role) query.role = role;
  if (search) {
    query.$or = [
      { firstName: { $regex: escapeRegex(search), $options: 'i' } },
      { lastName: { $regex: escapeRegex(search), $options: 'i' } },
      { email: { $regex: escapeRegex(search), $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .populate('children', 'firstName lastName class admissionNumber')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      page,
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

  await logAudit(req, { action: 'create', entity: 'User', entityId: user._id, after: snapshot(user) });

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

  // Admin can't demote or deactivate themselves (would lock them out)
  if (user._id.toString() === req.user._id.toString() &&
      ((req.body.role && req.body.role !== user.role) || req.body.isActive === false)) {
    res.status(400);
    throw new Error('You cannot change your own role or deactivate your own account');
  }

  const beforeDoc = snapshot(user);

  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  await logAudit(req, { action: 'update', entity: 'User', entityId: user._id, ...diffSnapshots(beforeDoc, updatedUser) });

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

  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      res.status(400);
      throw new Error('Cannot delete the last admin');
    }
  }

  // Detach this parent from their students so no student points at a deleted user
  if (user.role === 'parent' && (await Student.exists({ parent: user._id }))) {
    res.status(400);
    throw new Error('Cannot delete a parent who still has students linked. Reassign or remove the students first.');
  }

  await user.softDelete(req.user._id);
  await logAudit(req, { action: 'delete', entity: 'User', entityId: user._id, before: snapshot(user) });

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