import asyncHandler from 'express-async-handler';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const CLASS_ORDER = ['Jr. KG', 'Sr. KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// @desc    Get all students
// @route   GET /api/students
// @access  Private/Admin
export const getStudents = asyncHandler(async (req, res) => {
  const { class: studentClass, section, status, search, page = 1, limit = 10 } = req.query;
  const query = {};

  if (studentClass) query.class = studentClass;
  if (section) query.section = section;
  if (status) query.status = status;
  if (search) {
    const searchRegex = escapeRegex(search);
    query.$or = [
      { firstName: { $regex: searchRegex, $options: 'i' } },
      { lastName: { $regex: searchRegex, $options: 'i' } },
      { admissionNumber: { $regex: searchRegex, $options: 'i' } },
    ];
  }

  const total = await Student.countDocuments(query);
  const students = await Student.find(query)
    .populate('parent', 'firstName lastName email phone')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: students,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private
export const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('parent', 'firstName lastName email phone address');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Parents can only view their own children
  if (req.user.role === 'parent' && student.parent._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this student');
  }

  res.status(200).json({ success: true, data: student });
});

// @desc    Create student
// @route   POST /api/students
// @access  Private/Admin
export const createStudent = asyncHandler(async (req, res) => {
  // Check if admission number already exists
  const existingStudent = await Student.findOne({ admissionNumber: req.body.admissionNumber });
  if (existingStudent) {
    res.status(400);
    throw new Error('A student with this admission number already exists');
  }

  // Verify parent exists
  if (req.body.parent) {
    const parent = await User.findById(req.body.parent);
    if (!parent || parent.role !== 'parent') {
      res.status(400);
      throw new Error('Invalid parent reference');
    }
  }

  const student = await Student.create(req.body);

  // Add student to parent's children array
  if (student.parent) {
    await User.findByIdAndUpdate(student.parent, {
      $addToSet: { children: student._id },
    });
  }

  const populatedStudent = await Student.findById(student._id)
    .populate('parent', 'firstName lastName email phone');

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: populatedStudent,
  });
});

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private/Admin
export const updateStudent = asyncHandler(async (req, res) => {
  let student = await Student.findById(req.params.id);

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // If parent is changing, update both old and new parent's children arrays
  if (req.body.parent && req.body.parent !== student.parent.toString()) {
    await User.findByIdAndUpdate(student.parent, {
      $pull: { children: student._id },
    });
    await User.findByIdAndUpdate(req.body.parent, {
      $addToSet: { children: student._id },
    });
  }

  student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('parent', 'firstName lastName email phone');

  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: student,
  });
});

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private/Admin
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Remove student from parent's children array
  if (student.parent) {
    await User.findByIdAndUpdate(student.parent, {
      $pull: { children: student._id },
    });
  }

  await Student.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Student deleted successfully',
  });
});

// @desc    Get students by parent ID
// @route   GET /api/students/parent/:parentId
// @access  Private
export const getStudentsByParent = asyncHandler(async (req, res) => {
  // Parents can only view their own children
  if (req.user.role === 'parent' && req.params.parentId !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const students = await Student.find({ parent: req.params.parentId })
    .populate('parent', 'firstName lastName email phone')
    .sort({ firstName: 1 });

  res.status(200).json({ success: true, data: students });
});

// @desc    Get students by class
// @route   GET /api/students/class/:class
// @access  Private/Admin
export const getStudentsByClass = asyncHandler(async (req, res) => {
  const students = await Student.find({
    class: req.params.class,
    status: 'active',
  })
    .populate('parent', 'firstName lastName email phone')
    .sort({ rollNumber: 1 });

  res.status(200).json({ success: true, data: students });
});

// @desc    Bulk promote students to next class
// @route   POST /api/students/promote
// @access  Private/Admin
export const promoteStudents = asyncHandler(async (req, res) => {
  const { fromClass, studentIds, newAcademicYear, resetRollNumber } = req.body;

  if (!fromClass || !CLASS_ORDER.includes(fromClass)) {
    res.status(400);
    throw new Error('Invalid class specified');
  }

  const currentIndex = CLASS_ORDER.indexOf(fromClass);
  const isLastClass = currentIndex === CLASS_ORDER.length - 1;
  const toClass = isLastClass ? null : CLASS_ORDER[currentIndex + 1];

  const filter = { class: fromClass, status: 'active' };
  if (studentIds && studentIds.length > 0) {
    filter._id = { $in: studentIds };
  }

  const updateFields = isLastClass
    ? { status: 'graduated' }
    : { class: toClass };

  if (newAcademicYear) updateFields.academicYear = newAcademicYear;
  if (resetRollNumber) updateFields.rollNumber = '';

  const result = await Student.updateMany(filter, { $set: updateFields });

  const message = isLastClass
    ? `${result.modifiedCount} students graduated from Class ${fromClass}`
    : `${result.modifiedCount} students promoted to Class ${toClass}`;

  res.status(200).json({
    success: true,
    message,
    data: { modifiedCount: result.modifiedCount, fromClass, toClass: toClass ?? 'GRADUATED' },
  });
});