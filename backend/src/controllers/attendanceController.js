import asyncHandler from 'express-async-handler';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private/Admin
export const getAttendance = asyncHandler(async (req, res) => {
  const { studentId, date, startDate, endDate, status, class: studentClass, page = 1, limit = 50 } = req.query;
  const query = {};

  if (studentId) query.student = studentId;
  if (status) query.status = status;

  if (date) {
    const d = new Date(date);
    query.date = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lte: new Date(d.setHours(23, 59, 59, 999)),
    };
  } else if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // If filtering by class, get student IDs first
  if (studentClass) {
    const students = await Student.find({ class: studentClass, status: 'active' }).select('_id');
    query.student = { $in: students.map(s => s._id) };
  }

  const total = await Attendance.countDocuments(query);
  const records = await Attendance.find(query)
    .populate('student', 'firstName lastName class section rollNumber admissionNumber')
    .populate('markedBy', 'firstName lastName')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ date: -1, 'student.rollNumber': 1 });

  res.status(200).json({
    success: true,
    data: records,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Mark attendance (single)
// @route   POST /api/attendance
// @access  Private/Admin
export const markAttendance = asyncHandler(async (req, res) => {
  const { student, date, status, remarks } = req.body;

  // Normalize date to start of day
  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  // Check if attendance already exists for this student on this date
  const existing = await Attendance.findOne({
    student,
    date: attendanceDate,
  });

  if (existing) {
    // Update existing record
    existing.status = status;
    existing.remarks = remarks;
    existing.markedBy = req.user._id;
    await existing.save();

    const populated = await Attendance.findById(existing._id)
      .populate('student', 'firstName lastName class section rollNumber')
      .populate('markedBy', 'firstName lastName');

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

  const populated = await Attendance.findById(attendance._id)
    .populate('student', 'firstName lastName class section rollNumber')
    .populate('markedBy', 'firstName lastName');

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

  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  const results = [];

  for (const record of records) {
    const existing = await Attendance.findOne({
      student: record.student,
      date: attendanceDate,
    });

    if (existing) {
      existing.status = record.status;
      existing.remarks = record.remarks;
      existing.markedBy = req.user._id;
      await existing.save();
      results.push(existing);
    } else {
      const attendance = await Attendance.create({
        student: record.student,
        date: attendanceDate,
        status: record.status,
        remarks: record.remarks || '',
        markedBy: req.user._id,
      });
      results.push(attendance);
    }
  }

  res.status(201).json({
    success: true,
    message: `Attendance marked for ${results.length} students`,
    data: results,
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
    if (!student || student.parent.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this student\'s attendance');
    }
  }

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
    if (!student || student.parent.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized');
    }
  }

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

  await Attendance.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Attendance record deleted',
  });
});