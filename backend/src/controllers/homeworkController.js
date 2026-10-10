import asyncHandler from 'express-async-handler';
import { logAudit, snapshot, diffSnapshots } from '../utils/audit.js';
import { parsePagination, pick } from '../utils/queryHelpers.js';
import Homework from '../models/Homework.js';
import Student from '../models/Student.js';
import { classScopeFilter, teacherCanWriteClass } from '../middleware/teacherScope.js';

const HOMEWORK_FIELDS = ['class', 'section', 'subject', 'title', 'description', 'dueDate'];

// Admin: everything. Teacher: their classes. Parent: their children's classes (read-only).
const scopeFor = async (user) => {
  if (user.role !== 'parent') return classScopeFilter(user);
  const kids = await Student.find({ parent: user._id, status: 'active' }).select('class section');
  if (!kids.length) return { _id: { $in: [] } };
  return { $or: kids.flatMap((k) => [{ class: k.class, section: k.section || '' }, { class: k.class, section: '' }]) };
};

const denyClass = (res) => {
  res.status(403);
  throw new Error('You are not assigned to this class');
};

// @desc    List homework
// @route   GET /api/homework
// @access  Private (admin, teacher, parent - scoped)
export const getHomework = asyncHandler(async (req, res) => {
  const { class: cls, section, subject, upcoming } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 50);

  const filters = {};
  if (cls) filters.class = cls;
  if (section) filters.section = section;
  if (subject) filters.subject = subject;
  if (upcoming === 'true') filters.dueDate = { $gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) };

  const query = { $and: [await scopeFor(req.user), filters] };
  const total = await Homework.countDocuments(query);
  const data = await Homework.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort({ dueDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({ success: true, data, pagination: { total, page, pages: Math.ceil(total / limit) } });
});

// @desc    Create homework
// @route   POST /api/homework
// @access  Private/Admin,Teacher
export const createHomework = asyncHandler(async (req, res) => {
  const body = pick(req.body, HOMEWORK_FIELDS);
  if (!teacherCanWriteClass(req.user, body.class, body.section)) return denyClass(res);

  const homework = await Homework.create({ ...body, createdBy: req.user._id });
  await logAudit(req, { action: 'create', entity: 'Homework', entityId: homework._id, after: snapshot(homework) });

  res.status(201).json({ success: true, message: 'Homework added', data: homework });
});

// @desc    Update homework
// @route   PUT /api/homework/:id
// @access  Private/Admin,Teacher
export const updateHomework = asyncHandler(async (req, res) => {
  const homework = await Homework.findById(req.params.id);
  if (!homework) {
    res.status(404);
    throw new Error('Homework not found');
  }
  if (!teacherCanWriteClass(req.user, homework.class, homework.section)) return denyClass(res);

  const updates = pick(req.body, HOMEWORK_FIELDS);
  // Moving it to another class needs access to that class too
  if (!teacherCanWriteClass(req.user, updates.class ?? homework.class, updates.section ?? homework.section)) return denyClass(res);

  const before = snapshot(homework);
  homework.set(updates);
  await homework.save();
  await logAudit(req, { action: 'update', entity: 'Homework', entityId: homework._id, ...diffSnapshots(before, homework) });

  res.status(200).json({ success: true, message: 'Homework updated', data: homework });
});

// @desc    Delete homework
// @route   DELETE /api/homework/:id
// @access  Private/Admin,Teacher
export const deleteHomework = asyncHandler(async (req, res) => {
  const homework = await Homework.findById(req.params.id);
  if (!homework) {
    res.status(404);
    throw new Error('Homework not found');
  }
  if (!teacherCanWriteClass(req.user, homework.class, homework.section)) return denyClass(res);

  await homework.softDelete(req.user._id);
  await logAudit(req, { action: 'delete', entity: 'Homework', entityId: homework._id, before: snapshot(homework) });

  res.status(200).json({ success: true, message: 'Homework deleted' });
});
