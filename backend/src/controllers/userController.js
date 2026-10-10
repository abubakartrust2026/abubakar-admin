import { randomInt } from 'crypto';
import asyncHandler from 'express-async-handler';
import { logAudit, snapshot, diffSnapshots } from '../utils/audit.js';
import { parsePagination, pick } from '../utils/queryHelpers.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// `children` is maintained via Student.parent links, never set directly
const USER_CREATE_FIELDS = ['firstName', 'lastName', 'email', 'password', 'role', 'phone', 'address', 'isActive'];
const USER_UPDATE_FIELDS = ['firstName', 'lastName', 'email', 'role', 'phone', 'address', 'isActive'];

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 10);
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

  const user = await User.create(pick(req.body, USER_CREATE_FIELDS));

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

  const updatedUser = await User.findByIdAndUpdate(req.params.id, pick(req.body, USER_UPDATE_FIELDS), {
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

// Random 8-char fallback password; skips look-alike characters (0/O, 1/l/I) so it's easy to read out
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generateTempPassword = () =>
  Array.from({ length: 8 }, () => TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)]).join('');

// Initial password = the parent's first active child's admission number (same as the username),
// so parents have nothing extra to remember. A change is forced at first login, so it never stays.
// Falls back to a random password when there's no usable admission number (User needs 6+ chars).
const initialPasswordFor = (students) => {
  const admissionNumber = students.map((s) => String(s.admissionNumber || '').trim()).sort()[0];
  return admissionNumber && admissionNumber.length >= 6 ? admissionNumber : generateTempPassword();
};

// Sets the initial password (hashed by the pre-save hook) and forces a change on next login
const issueTempPassword = async (user, students) => {
  const tempPassword = initialPasswordFor(students);
  user.password = tempPassword;
  user.mustChangePassword = true;
  await user.save();
  return tempPassword;
};

// @desc    Issue a temporary password for one parent
// @route   POST /api/users/:id/reset-parent-password
// @access  Private/Admin
export const resetParentPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'parent') {
    res.status(404);
    throw new Error('Parent not found');
  }

  const students = await Student.find({ parent: user._id, status: 'active' }).select('firstName lastName class admissionNumber');
  const tempPassword = await issueTempPassword(user, students);

  // The password itself is deliberately not written to the audit log
  await logAudit(req, { action: 'update', entity: 'User', entityId: user._id, before: { passwordReset: false }, after: { passwordReset: true } });

  res.status(200).json({
    success: true,
    message: 'Temporary password generated. Share it with the parent; it is shown only once.',
    data: {
      parentName: user.getFullName(),
      tempPassword,
      students: students.map((s) => ({ admissionNumber: s.admissionNumber, name: `${s.firstName} ${s.lastName}`, class: s.class })),
    },
  });
});

// @desc    Issue temporary passwords for many parents (for a credentials sheet)
// @route   POST /api/users/parent-credentials/bulk
// @access  Private/Admin
export const bulkParentCredentials = asyncHandler(async (req, res) => {
  const { parentIds, class: studentClass, all } = req.body;

  // Resetting overwrites passwords parents may already be using, so a scope must be explicit
  let parentFilter;
  if (Array.isArray(parentIds) && parentIds.length) {
    parentFilter = { _id: { $in: parentIds } };
  } else if (studentClass) {
    const ids = await Student.distinct('parent', { class: studentClass, status: 'active' });
    parentFilter = { _id: { $in: ids } };
  } else if (all === true) {
    parentFilter = {};
  } else {
    res.status(400);
    throw new Error('Provide parentIds, a class, or all: true');
  }

  const parents = await User.find({ ...parentFilter, role: 'parent', isActive: true });
  const rows = [];
  for (const parent of parents) {
    const students = await Student.find({ parent: parent._id, status: 'active' }).select('firstName lastName class admissionNumber');
    const tempPassword = await issueTempPassword(parent, students);
    students.forEach((s) => {
      rows.push({
        admissionNumber: s.admissionNumber,
        studentName: `${s.firstName} ${s.lastName}`,
        class: s.class,
        parentName: parent.getFullName(),
        tempPassword,
      });
    });
  }

  await logAudit(req, { action: 'update', entity: 'User', entityId: req.user._id, before: {}, after: { bulkParentPasswordReset: parents.length } });

  res.status(200).json({ success: true, message: `Temporary passwords issued for ${parents.length} parent(s)`, data: rows });
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