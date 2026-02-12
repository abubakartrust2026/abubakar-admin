import asyncHandler from 'express-async-handler';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

// @desc    Get fee collection report (monthly totals + class breakdown)
// @route   GET /api/reports/fee-collection
// @access  Private/Admin
export const getFeeCollectionReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, classFilter } = req.query;

  const matchStage = { status: 'completed' };
  if (startDate && endDate) {
    matchStage.transactionDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const basePipeline = [
    { $match: matchStage },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    ...(classFilter ? [{ $match: { 'studentInfo.class': classFilter } }] : []),
  ];

  const monthlyCollection = await Payment.aggregate([
    ...basePipeline,
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$transactionDate' } },
        totalCollected: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const classBreakdown = await Payment.aggregate([
    ...basePipeline,
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$transactionDate' } }, class: '$studentInfo.class' },
        totalCollected: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1, '_id.class': 1 } },
  ]);

  const grandTotal = monthlyCollection.reduce((sum, m) => sum + m.totalCollected, 0);
  const totalPayments = monthlyCollection.reduce((sum, m) => sum + m.paymentCount, 0);

  res.status(200).json({
    success: true,
    data: {
      monthlyCollection: monthlyCollection.map(m => ({ month: m._id, totalCollected: m.totalCollected, paymentCount: m.paymentCount })),
      classBreakdown: classBreakdown.map(c => ({ month: c._id.month, class: c._id.class, totalCollected: c.totalCollected, paymentCount: c.paymentCount })),
      grandTotal,
      totalPayments,
    },
  });
});

// @desc    Get outstanding dues report
// @route   GET /api/reports/outstanding-dues
// @access  Private/Admin
export const getOutstandingDuesReport = asyncHandler(async (req, res) => {
  const { classFilter, page = 1, limit = 20 } = req.query;

  const pipeline = [
    { $match: { status: { $in: ['pending', 'partially_paid'] } } },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    ...(classFilter ? [{ $match: { 'studentInfo.class': classFilter } }] : []),
    { $lookup: { from: 'users', localField: 'parent', foreignField: '_id', as: 'parentInfo' } },
    { $unwind: '$parentInfo' },
    {
      $lookup: {
        from: 'payments',
        let: { invoiceId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$invoice', '$$invoiceId'] }, status: 'completed' } },
          { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
        ],
        as: 'paymentInfo',
      },
    },
    {
      $addFields: {
        amountPaid: { $ifNull: [{ $arrayElemAt: ['$paymentInfo.totalPaid', 0] }, 0] },
        amountDue: { $subtract: ['$total', { $ifNull: [{ $arrayElemAt: ['$paymentInfo.totalPaid', 0] }, 0] }] },
        isOverdue: { $lt: ['$dueDate', new Date()] },
      },
    },
    { $sort: { dueDate: 1 } },
  ];

  const countResult = await Invoice.aggregate([...pipeline, { $count: 'total' }]);
  const total = countResult[0]?.total || 0;

  const invoices = await Invoice.aggregate([
    ...pipeline,
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) },
    {
      $project: {
        invoiceNumber: 1, total: 1, amountPaid: 1, amountDue: 1, dueDate: 1, status: 1, isOverdue: 1,
        studentName: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] },
        studentClass: '$studentInfo.class',
        parentName: { $concat: ['$parentInfo.firstName', ' ', '$parentInfo.lastName'] },
        parentPhone: '$parentInfo.phone',
      },
    },
  ]);

  // Summary
  const summary = await Invoice.aggregate([
    { $match: { status: { $in: ['pending', 'partially_paid'] } } },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    ...(classFilter ? [{ $match: { 'studentInfo.class': classFilter } }] : []),
    {
      $lookup: {
        from: 'payments',
        let: { invoiceId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$invoice', '$$invoiceId'] }, status: 'completed' } },
          { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
        ],
        as: 'paymentInfo',
      },
    },
    {
      $group: {
        _id: null,
        totalBilled: { $sum: '$total' },
        totalPaid: { $sum: { $ifNull: [{ $arrayElemAt: ['$paymentInfo.totalPaid', 0] }, 0] } },
        invoiceCount: { $sum: 1 },
        overdueCount: { $sum: { $cond: [{ $lt: ['$dueDate', new Date()] }, 1, 0] } },
      },
    },
  ]);

  const s = summary[0] || { totalBilled: 0, totalPaid: 0, invoiceCount: 0, overdueCount: 0 };

  res.status(200).json({
    success: true,
    data: {
      invoices,
      summary: { ...s, totalDue: s.totalBilled - s.totalPaid },
    },
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// @desc    Get payment history report
// @route   GET /api/reports/payment-history
// @access  Private/Admin
export const getPaymentHistoryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, classFilter, paymentMethod, page = 1, limit = 20 } = req.query;

  const matchStage = { status: 'completed' };
  if (startDate && endDate) {
    matchStage.transactionDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (paymentMethod) matchStage.paymentMethod = paymentMethod;

  const basePipeline = [
    { $match: matchStage },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    ...(classFilter ? [{ $match: { 'studentInfo.class': classFilter } }] : []),
    { $lookup: { from: 'invoices', localField: 'invoice', foreignField: '_id', as: 'invoiceInfo' } },
    { $unwind: '$invoiceInfo' },
    { $sort: { transactionDate: -1 } },
  ];

  const countResult = await Payment.aggregate([...basePipeline, { $count: 'total' }]);
  const total = countResult[0]?.total || 0;

  const payments = await Payment.aggregate([
    ...basePipeline,
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) },
    {
      $project: {
        paymentNumber: 1, receiptNumber: 1, amount: 1, paymentMethod: 1,
        transactionDate: 1, remarks: 1,
        studentName: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] },
        studentClass: '$studentInfo.class',
        invoiceNumber: '$invoiceInfo.invoiceNumber',
      },
    },
  ]);

  // Method-wise summary
  const methodSummary = await Payment.aggregate([
    { $match: matchStage },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    ...(classFilter ? [{ $match: { 'studentInfo.class': classFilter } }] : []),
    { $group: { _id: '$paymentMethod', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { totalAmount: -1 } },
  ]);

  const grandTotal = methodSummary.reduce((sum, m) => sum + m.totalAmount, 0);

  res.status(200).json({
    success: true,
    data: {
      payments,
      methodSummary: methodSummary.map(m => ({ method: m._id, totalAmount: m.totalAmount, count: m.count })),
      grandTotal,
    },
    pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// @desc    Get class-wise fee summary
// @route   GET /api/reports/class-wise-summary
// @access  Private/Admin
export const getClassWiseFeeSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, academicYear } = req.query;

  const invoiceMatch = {};
  if (academicYear) invoiceMatch.academicYear = academicYear;
  if (startDate && endDate) {
    invoiceMatch.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const classSummary = await Invoice.aggregate([
    { $match: invoiceMatch },
    { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    {
      $lookup: {
        from: 'payments',
        let: { invoiceId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$invoice', '$$invoiceId'] }, status: 'completed' } },
          { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
        ],
        as: 'paymentInfo',
      },
    },
    {
      $group: {
        _id: '$studentInfo.class',
        totalBilled: { $sum: '$total' },
        totalCollected: { $sum: { $ifNull: [{ $arrayElemAt: ['$paymentInfo.totalPaid', 0] }, 0] } },
        invoiceCount: { $sum: 1 },
        studentIds: { $addToSet: '$student' },
      },
    },
    {
      $addFields: {
        totalPending: { $subtract: ['$totalBilled', '$totalCollected'] },
        collectionRate: {
          $cond: [{ $eq: ['$totalBilled', 0] }, 0, { $multiply: [{ $divide: ['$totalCollected', '$totalBilled'] }, 100] }],
        },
        studentCount: { $size: '$studentIds' },
      },
    },
    { $project: { studentIds: 0 } },
    { $sort: { _id: 1 } },
  ]);

  const totals = classSummary.reduce((acc, c) => ({
    totalBilled: acc.totalBilled + c.totalBilled,
    totalCollected: acc.totalCollected + c.totalCollected,
    totalPending: acc.totalPending + c.totalPending,
  }), { totalBilled: 0, totalCollected: 0, totalPending: 0 });

  res.status(200).json({
    success: true,
    data: {
      classSummary: classSummary.map(c => ({
        class: c._id,
        totalBilled: c.totalBilled,
        totalCollected: c.totalCollected,
        totalPending: c.totalPending,
        collectionRate: Math.round(c.collectionRate * 100) / 100,
        invoiceCount: c.invoiceCount,
        studentCount: c.studentCount,
      })),
      totals,
    },
  });
});
