import asyncHandler from 'express-async-handler';
import { logAudit, snapshot } from '../utils/audit.js';
import Timetable, { WEEK_DAYS } from '../models/Timetable.js';
import User from '../models/User.js';
import { classScopeFilter } from '../middleware/teacherScope.js';

const byDay = (a, b) => WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day);

// @desc    Timetable for a class (teachers: only their classes)
// @route   GET /api/timetable?class=&section=
// @access  Private/Admin,Teacher
export const getTimetable = asyncHandler(async (req, res) => {
  const { class: cls, section } = req.query;
  const filters = {};
  if (cls) filters.class = cls;
  if (section) filters.section = { $in: [section, ''] }; // section-specific plus whole-class rows

  const rows = await Timetable.find({ $and: [classScopeFilter(req.user), filters] })
    .populate('periods.teacher', 'firstName lastName')
    .sort({ class: 1, section: 1 });

  res.status(200).json({ success: true, data: rows.sort(byDay) });
});

// @desc    The logged-in teacher's own periods across all classes
// @route   GET /api/timetable/mine
// @access  Private/Teacher
export const getMyTimetable = asyncHandler(async (req, res) => {
  const rows = await Timetable.find({ 'periods.teacher': req.user._id });
  const data = rows
    .map((r) => ({
      class: r.class,
      section: r.section,
      day: r.day,
      periods: r.periods.filter((p) => String(p.teacher) === String(req.user._id)),
    }))
    .sort(byDay);

  res.status(200).json({ success: true, data });
});

// @desc    Replace one day's periods for a class (empty list clears the day)
// @route   PUT /api/timetable
// @access  Private/Admin
export const saveTimetableDay = asyncHandler(async (req, res) => {
  const cls = String(req.body.class || '').trim();
  const section = String(req.body.section || '').trim();
  const { day } = req.body;
  const periods = Array.isArray(req.body.periods) ? req.body.periods : [];

  if (!cls || !WEEK_DAYS.includes(day)) {
    res.status(400);
    throw new Error('Class and a valid day are required');
  }
  for (const p of periods) {
    if (!p.start || !p.end || !String(p.subject || '').trim() || p.end <= p.start) {
      res.status(400);
      throw new Error('Every period needs a subject, and its end time must be after its start time');
    }
  }
  const teacherIds = [...new Set(periods.map((p) => p.teacher).filter(Boolean).map(String))];
  if (teacherIds.length && (await User.countDocuments({ _id: { $in: teacherIds }, role: 'teacher' })) !== teacherIds.length) {
    res.status(400);
    throw new Error('Invalid teacher selected');
  }

  const clean = periods
    .map((p) => ({ start: p.start, end: p.end, subject: String(p.subject).trim(), teacher: p.teacher || undefined }))
    .sort((a, b) => a.start.localeCompare(b.start));

  if (!clean.length) {
    await Timetable.deleteOne({ class: cls, section, day });
    await logAudit(req, { action: 'delete', entity: 'Timetable', meta: { class: cls, section, day } });
    return res.status(200).json({ success: true, message: 'Day cleared', data: null });
  }

  const row = await Timetable.findOneAndUpdate(
    { class: cls, section, day },
    { $set: { periods: clean } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await logAudit(req, { action: 'update', entity: 'Timetable', entityId: row._id, after: snapshot(row) });

  res.status(200).json({ success: true, message: 'Timetable saved', data: row });
});
