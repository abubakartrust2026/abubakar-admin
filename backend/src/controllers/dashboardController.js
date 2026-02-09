import asyncHandler from 'express-async-handler';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

// @desc    Get admin dashboard stats
// @route   GET /api/dashboard/admin
// @access  Private/Admin
export const getAdminDashboard = asyncHandler(async (req, res) => {
  // Total counts
  const totalStudents = await Student.countDocuments({ status: 'active' });
  const totalParents = await User.countDocuments({ role: 'parent', isActive: true });

  // Today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const todayAttendance = await Attendance.find({
    date: { $gte: today, $lte: todayEnd },
  });

  const presentToday = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = todayAttendance.length > 0
    ? ((presentToday / todayAttendance.length) * 100).toFixed(1)
    : 0;

  // Revenue stats
  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRevenue = await Payment.aggregate([
    { $match: { status: 'completed', transactionDate: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$transactionDate' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Pending invoices
  const pendingInvoices = await Invoice.countDocuments({
    status: { $in: ['pending', 'partially_paid'] },
  });
  const overdueInvoices = await Invoice.countDocuments({
    status: 'pending',
    dueDate: { $lt: new Date() },
  });

  const totalPending = await Invoice.aggregate([
    { $match: { status: { $in: ['pending', 'partially_paid'] } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  // Recent payments
  const recentPayments = await Payment.find({ status: 'completed' })
    .populate('student', 'firstName lastName class')
    .populate('parent', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(5);

  // Students by class
  const studentsByClass = await Student.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$class', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Weekly attendance trend (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyAttendance = await Attendance.aggregate([
    { $match: { date: { $gte: weekAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalStudents,
        totalParents,
        attendanceRate: parseFloat(attendanceRate),
        presentToday,
        totalAttendanceToday: todayAttendance.length,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingInvoices,
        overdueInvoices,
        totalPendingAmount: totalPending[0]?.total || 0,
      },
      monthlyRevenue,
      recentPayments,
      studentsByClass,
      weeklyAttendance,
    },
  });
});

// @desc    Get parent dashboard stats
// @route   GET /api/dashboard/parent
// @access  Private/Parent
export const getParentDashboard = asyncHandler(async (req, res) => {
  const parentId = req.user._id;

  // Get children
  const children = await Student.find({ parent: parentId, status: 'active' });
  const childIds = children.map(c => c._id);

  // Attendance for each child (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const childrenData = await Promise.all(
    children.map(async (child) => {
      const attendance = await Attendance.find({
        student: child._id,
        date: { $gte: thirtyDaysAgo },
      }).sort({ date: -1 });

      const totalDays = attendance.length;
      const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;

      // Pending invoices
      const pendingInvoices = await Invoice.find({
        student: child._id,
        status: { $in: ['pending', 'partially_paid', 'overdue'] },
      }).sort({ dueDate: 1 });

      const totalDue = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);

      return {
        student: child,
        attendance: {
          totalDays,
          presentDays,
          attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0,
          recentRecords: attendance.slice(0, 7),
        },
        fees: {
          pendingInvoices: pendingInvoices.length,
          totalDue,
          upcomingDue: pendingInvoices[0] || null,
        },
      };
    })
  );

  // Recent payments
  const recentPayments = await Payment.find({
    parent: parentId,
    status: 'completed',
  })
    .populate('student', 'firstName lastName class')
    .populate('invoice', 'invoiceNumber')
    .sort({ transactionDate: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      children: childrenData,
      recentPayments,
    },
  });
});