import asyncHandler from 'express-async-handler';
import { logAudit } from '../utils/audit.js';
import Marks from '../models/Marks.js';
import Student from '../models/Student.js';
import { studentScopeFilter, teacherCanAccessClass } from '../middleware/teacherScope.js';

const denyClass = (res) => {
  res.status(403);
  throw new Error('You are not assigned to this class');
};

const classStudents = (user, cls, section) =>
  Student.find({ class: cls, status: 'active', ...(section && { section }), ...studentScopeFilter(user) })
    .select('firstName lastName rollNumber section admissionNumber academicYear')
    .sort({ rollNumber: 1 });

// @desc    Marks for a class (optionally one exam/subject)
// @route   GET /api/marks?class=&section=&exam=&subject=
// @access  Private/Admin,Teacher
export const getMarks = asyncHandler(async (req, res) => {
  const { class: cls, section, exam, subject } = req.query;
  if (!cls) {
    res.status(400);
    throw new Error('Please choose a class');
  }
  if (!teacherCanAccessClass(req.user, cls, section)) return denyClass(res);

  const students = await classStudents(req.user, cls, section);
  const query = { student: { $in: students.map((s) => s._id) } };
  if (exam) query.exam = exam;
  if (subject) query.subject = subject;

  const data = await Marks.find(query).populate('student', 'firstName lastName rollNumber section').sort({ exam: 1, subject: 1 });
  res.status(200).json({ success: true, data });
});

// @desc    Enter / update marks for many students of one exam + subject
// @route   POST /api/marks/bulk
// @access  Private/Admin,Teacher
export const bulkSaveMarks = asyncHandler(async (req, res) => {
  const { exam, subject, academicYear, records } = req.body;
  const maxMarks = Number(req.body.maxMarks);

  if (!String(exam || '').trim() || !String(subject || '').trim() || !String(academicYear || '').trim()) {
    res.status(400);
    throw new Error('Exam, subject and academic year are required');
  }
  if (!Number.isFinite(maxMarks) || maxMarks < 1) {
    res.status(400);
    throw new Error('Maximum marks must be at least 1');
  }
  if (!Array.isArray(records) || !records.length) {
    res.status(400);
    throw new Error('Please provide marks records');
  }

  // A blank mark means "not entered / absent" and is skipped
  const entered = records.filter((r) => r.marksObtained !== '' && r.marksObtained !== null && r.marksObtained !== undefined);
  for (const r of entered) {
    const m = Number(r.marksObtained);
    if (!Number.isFinite(m) || m < 0 || m > maxMarks) {
      res.status(400);
      throw new Error(`Marks must be between 0 and ${maxMarks}`);
    }
  }
  if (!entered.length) {
    res.status(400);
    throw new Error('Enter marks for at least one student');
  }

  const ids = [...new Set(entered.map((r) => String(r.student)))];
  const allowed = await Student.countDocuments({ _id: { $in: ids }, ...studentScopeFilter(req.user) });
  if (allowed !== ids.length) return denyClass(res);

  await Marks.bulkWrite(
    entered.map((r) => ({
      updateOne: {
        filter: { student: r.student, exam: String(exam).trim(), subject: String(subject).trim() },
        update: {
          $set: { maxMarks, marksObtained: Number(r.marksObtained), academicYear: String(academicYear).trim(), enteredBy: req.user._id },
        },
        upsert: true,
      },
    }))
  );

  await logAudit(req, {
    action: 'bulk_update',
    entity: 'Marks',
    meta: { exam, subject, maxMarks, academicYear, count: entered.length },
  });

  res.status(200).json({ success: true, message: `Marks saved for ${entered.length} students` });
});
