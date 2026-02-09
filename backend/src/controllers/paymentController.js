import asyncHandler from 'express-async-handler';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = asyncHandler(async (req, res) => {
  const { studentId, invoiceId, status, startDate, endDate, page = 1, limit = 10 } = req.query;
  const query = {};

  if (studentId) query.student = studentId;
  if (invoiceId) query.invoice = invoiceId;
  if (status) query.status = status;

  // Parents can only view their own payments
  if (req.user.role === 'parent') {
    query.parent = req.user._id;
  }

  if (startDate && endDate) {
    query.transactionDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const total = await Payment.countDocuments(query);
  const payments = await Payment.find(query)
    .populate('student', 'firstName lastName class admissionNumber')
    .populate('parent', 'firstName lastName email')
    .populate('invoice', 'invoiceNumber total')
    .populate('receivedBy', 'firstName lastName')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ transactionDate: -1 });

  res.status(200).json({
    success: true,
    data: payments,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('student', 'firstName lastName class section admissionNumber')
    .populate('parent', 'firstName lastName email phone address')
    .populate('invoice', 'invoiceNumber total dueDate items')
    .populate('receivedBy', 'firstName lastName');

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  if (req.user.role === 'parent' && payment.parent._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this payment');
  }

  res.status(200).json({ success: true, data: payment });
});

// @desc    Record a payment
// @route   POST /api/payments
// @access  Private/Admin
export const createPayment = asyncHandler(async (req, res) => {
  const { invoice: invoiceId, amount } = req.body;

  // Verify invoice exists
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Check amount doesn't exceed what's due
  const existingPayments = await Payment.find({ invoice: invoiceId, status: 'completed' });
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = invoice.total - totalPaid;

  if (amount > amountDue) {
    res.status(400);
    throw new Error(`Payment amount exceeds amount due (${amountDue})`);
  }

  const payment = await Payment.create({
    ...req.body,
    student: invoice.student,
    parent: invoice.parent,
    receivedBy: req.user._id,
  });

  // Update invoice status
  const newTotalPaid = totalPaid + amount;
  if (newTotalPaid >= invoice.total) {
    invoice.status = 'paid';
  } else if (newTotalPaid > 0) {
    invoice.status = 'partially_paid';
  }
  await invoice.save();

  const populated = await Payment.findById(payment._id)
    .populate('student', 'firstName lastName class admissionNumber')
    .populate('parent', 'firstName lastName email')
    .populate('invoice', 'invoiceNumber total');

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: populated,
  });
});

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private/Admin
export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  const updated = await Payment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('student', 'firstName lastName class admissionNumber')
    .populate('parent', 'firstName lastName email')
    .populate('invoice', 'invoiceNumber total');

  res.status(200).json({
    success: true,
    message: 'Payment updated successfully',
    data: updated,
  });
});