import asyncHandler from 'express-async-handler';
import { logAudit, snapshot, diffSnapshots } from '../utils/audit.js';
import { parsePagination } from '../utils/queryHelpers.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { notifyParentsOfAttendance } from '../utils/whatsappService.js';
import { studentScopeFilter, teacherCanAccessStudent } from '../middleware/teacherScope.js';

const denyTeacher = (res) => {
  res.status(403);
  throw new Error("You are not assigned to this student's class");
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private/Admin
export const getAttendance = asyncHandler(async (req, res) => {
  const { studentId, date, startDate, endDate, status, class: studentClass } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 50);
  const query = {};

  if (studentId) query.student = studentId;
  if (status) query.status = status;

  if (date) {
    // Date-only values are stored as UTC midnight; use UTC so server timezone doesn't shift the day
    const d = new Date(date);
    query.date = {
      $gte: new Date(d.setUTCHours(0, 0, 0, 0)),
      $lte: new Date(d.setUTCHours(23, 59, 59, 999)),
    };
  } else if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // If filtering by class (always the case for teachers, who are limited to their classes), get student IDs first
  if (req.user.role === 'teacher' && !studentClass && !studentId) {
    res.status(400);
    throw new Error('Please choose a class');
  }
  if (studentClass || req.user.role === 'teacher') {
    const students = await Student.find({
      ...(studentClass && { class: studentClass }),
      status: 'active',
      ...studentScopeFilter(req.user),
    }).select('_id');
    const ids = students.map(s => s._id);
    if (studentId) {
      // A single-student lookup must stay inside the class scope
      if (!ids.some(id => id.toString() === String(studentId))) return denyTeacher(res);
    } else {
      query.student = { $in: ids };
    }
  }

  const total = await Attendance.countDocuments(query);
  const records = await Attendance.find(query)
    .populate('student', 'firstName lastName class section rollNumber admissionNumber')
    .populate('markedBy', 'firstName lastName')
    .skip(skip)
    .limit(limit)
    .sort({ date: -1, 'student.rollNumber': 1 });

  res.status(200).json({
    success: true,
    data: records,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Mark attendance (single)
// @route   POST /api/attendance
// @access  Private/Admin
export const markAttendance = asyncHandler(async (req, res) => {
  const { student, date, status, remarks } = req.body;

  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user, student))) return denyTeacher(res);

  // Normalize date to start of day
  const attendanceDate = new Date(date);
  attendanceDate.setUTCHours(0, 0, 0, 0);

  // Check if attendance already exists for this student on this date
  const existing = await Attendance.findOne({
    student,
    date: attendanceDate,
  }).setOptions({ withDeleted: true });

  if (existing) {
    // Update existing record (or revive one that was soft-deleted)
    const beforeDoc = snapshot(existing);
    const wasDeleted = existing.isDeleted;
    existing.isDeleted = false;
    existing.deletedAt = undefined;
    existing.deletedBy = undefined;
    existing.status = status;
    existing.remarks = remarks;
    existing.markedBy = req.user._id;
    await existing.save();

    await logAudit(req, {
      action: wasDeleted ? 'restore' : 'update',
      entity: 'Attendance',
      entityId: existing._id,
      ...diffSnapshots(beforeDoc, existing),
    });

    const populated = await Attendance.findById(existing._id)
      .populate({ path: 'student', select: 'firstName lastName class section rollNumber parent', populate: { path: 'parent', select: 'phone' } })
      .populate('markedBy', 'firstName lastName');

    notifyParentsOfAttendance([populated]);

    return res.status(200).json({
      success: true,
      message: 'Attendance updated',
      data: populated,
    });
  }

  const attendance = await Attendance.create({
    student,
    date: attendanceDate,
    status,
    remarks,
    markedBy: req.user._id,
  });

  await logAudit(req, { action: 'create', entity: 'Attendance', entityId: attendance._id, after: snapshot(attendance) });

  const populated = await Attendance.findById(attendance._id)
    .populate({ path: 'student', select: 'firstName lastName class section rollNumber parent', populate: { path: 'parent', select: 'phone' } })
    .populate('markedBy', 'firstName lastName');

  notifyParentsOfAttendance([populated]);

  res.status(201).json({
    success: true,
    message: 'Attendance marked successfully',
    data: populated,
  });
});

// @desc    Bulk mark attendance
// @route   POST /api/attendance/bulk
// @access  Private/Admin
export const bulkMarkAttendance = asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  // records: [{ student: id, status: 'present'|'absent'|'late'|'excused', remarks: '' }]

  if (!records || !Array.isArray(records) || records.length === 0) {
    res.status(400);
    throw new Error('Please provide attendance records');
  }

  if (req.user.role === 'teacher') {
    const allowed = await Student.find({ _id: { $in: records.map(r => r.student) }, ...studentScopeFilter(req.user) }).select('_id');
    if (allowed.length !== new Set(records.map(r => String(r.student))).size) return denyTeacher(res);
  }

  const attendanceDate = new Date(date);
  attendanceDate.setUTCHours(0, 0, 0, 0);

  const results = [];
  const changes = []; // one audit entry for the whole batch, listing only what actually changed

  for (const record of records) {
    const existing = await Attendance.findOne({
      student: record.student,
      date: attendanceDate,
    }).setOptions({ withDeleted: true });

    if (existing) {
      const previousStatus = existing.isDeleted ? null : existing.status;
      existing.isDeleted = false;
      existing.deletedAt = undefined;
      existing.deletedBy = undefined;
      existing.status = record.status;
      existing.remarks = record.remarks;
      existing.markedBy = req.user._id;
      await existing.save();
      results.push(existing);
      if (previousStatus !== record.status) changes.push({ student: record.student, from: previousStatus, to: record.status });
    } else {
      const attendance = await Attendance.create({
        student: record.student,
        date: attendanceDate,
        status: record.status,
        remarks: record.remarks || '',
        markedBy: req.user._id,
      });
      results.push(attendance);
      changes.push({ student: record.student, from: null, to: record.status });
    }
  }

  await logAudit(req, {
    action: 'bulk_update',
    entity: 'Attendance',
    meta: { date: attendanceDate, submitted: records.length, changed: changes.length, changes },
  });

  await Attendance.populate(results, { path: 'student', select: 'firstName lastName class section rollNumber parent', populate: { path: 'parent', select: 'phone' } });
  const notificationSummary = await notifyParentsOfAttendance(results);

  res.status(201).json({
    success: true,
    message: `Attendance marked for ${results.length} students`,
    data: results,
    notifications: notificationSummary,
  });
});

// @desc    Get attendance by student
// @route   GET /api/attendance/student/:studentId
// @access  Private
export const getAttendanceByStudent = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = { student: req.params.studentId };

  // Check parent access
  if (req.user.role === 'parent') {
    const student = await Student.findById(req.params.studentId);
    if (!student || student.parent?.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this student\'s attendance');
    }
  }
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user, req.params.studentId))) return denyTeacher(res);

  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const records = await Attendance.find(query)
    .populate('markedBy', 'firstName lastName')
    .sort({ date: -1 });

  res.status(200).json({ success: true, data: records });
});

// @desc    Get attendance summary for a student
// @route   GET /api/attendance/summary/:studentId
// @access  Private
export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const query = { student: req.params.studentId };

  if (req.user.role === 'parent') {
    const student = await Student.findById(req.params.studentId);
    if (!student || student.parent?.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized');
    }
  }
  if (req.user.role === 'teacher' && !(await teacherCanAccessStudent(req.user, req.params.studentId))) return denyTeacher(res);

  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const records = await Attendance.find(query);

  const summary = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
  };
  summary.attendanceRate = summary.total > 0
    ? ((summary.present + summary.late) / summary.total * 100).toFixed(1)
    : 0;

  res.status(200).json({ success: true, data: summary });
});

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Admin
export const deleteAttendance = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);

  if (!record) {
    res.status(404);
    throw new Error('Attendance record not found');
  }

  await record.softDelete(req.user._id);
  await logAudit(req, { action: 'delete', entity: 'Attendance', entityId: record._id, before: snapshot(record) });

  res.status(200).json({
    success: true,
    message: 'Attendance record deleted',
  });
});