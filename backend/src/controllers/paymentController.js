import asyncHandler from 'express-async-handler';
import { logAudit, snapshot, diffSnapshots } from '../utils/audit.js';
import { escapeRegex, parsePagination } from '../utils/queryHelpers.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Student from '../models/Student.js';
import { PAYMENT_METHOD } from '../config/constants.js';

// Recomputes an invoice's status from its completed payments. Called after every
// payment create/update/delete so the invoice never drifts from the payment records.
const recalcInvoiceStatus = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice || invoice.status === 'cancelled') return invoice;

  const payments = await Payment.find({ invoice: invoice._id, status: 'completed' });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid >= invoice.total) invoice.status = 'paid';
  else if (totalPaid > 0) invoice.status = 'partially_paid';
  else invoice.status = invoice.dueDate && new Date() > invoice.dueDate ? 'overdue' : 'pending';

  await invoice.save();
  return invoice;
};

const populatePayment = (id) =>
  Payment.findById(id)
    .populate('student', 'firstName lastName class admissionNumber')
    .populate('parent', 'firstName lastName email')
    .populate('invoice', 'invoiceNumber total');

// Records a single payment against an already-fetched invoice, validating the
// amount against what's currently due and updating the invoice's paid status.
// Shared by createPayment (single) and bulkCreatePayments (CSV import) so both
// paths apply identical business rules.
const recordPaymentForInvoice = async (invoice, paymentData, userId) => {
  const amount = Number(paymentData.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Payment amount must be a positive number');
  }
  if (invoice.status === 'cancelled') {
    throw new Error('Cannot record a payment against a cancelled invoice');
  }

  const existingPayments = await Payment.find({ invoice: invoice._id, status: 'completed' });
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = invoice.total - totalPaid;

  if (amount > amountDue) {
    throw new Error(`Payment amount exceeds amount due (${amountDue})`);
  }

  const allowed = {};
  ['paymentMethod', 'transactionId', 'transactionDate', 'chequeNumber', 'chequeDate', 'bankName', 'remarks'].forEach((f) => {
    if (paymentData[f] !== undefined) allowed[f] = paymentData[f];
  });

  const payment = await Payment.create({
    ...allowed,
    amount,
    invoice: invoice._id,
    student: invoice.student,
    parent: invoice.parent,
    receivedBy: userId,
  });

  await recalcInvoiceStatus(invoice._id);

  return populatePayment(payment._id);
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = asyncHandler(async (req, res) => {
  const { studentId, invoiceId, status, startDate, endDate, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 10);
  const query = {};

  if (studentId) query.student = studentId;
  if (invoiceId) query.invoice = invoiceId;
  if (status) query.status = status;

  if (search) {
    const matchingStudents = await Student.find({
      $or: [
        { firstName: { $regex: escapeRegex(search), $options: 'i' } },
        { lastName: { $regex: escapeRegex(search), $options: 'i' } },
      ],
    }).select('_id');

    query.$or = [
      { receiptNumber: { $regex: escapeRegex(search), $options: 'i' } },
      { student: { $in: matchingStudents.map((s) => s._id) } },
    ];
  }

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
    .skip(skip)
    .limit(limit)
    .sort({ transactionDate: -1 });

  res.status(200).json({
    success: true,
    data: payments,
    pagination: {
      total,
      page,
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
  const { invoice: invoiceId } = req.body;

  // Verify invoice exists
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  let populated;
  try {
    populated = await recordPaymentForInvoice(invoice, req.body, req.user._id);
  } catch (err) {
    res.status(400);
    throw err;
  }

  await logAudit(req, { action: 'create', entity: 'Payment', entityId: populated._id, after: snapshot(populated) });

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: populated,
  });
});

// @desc    Bulk-record payments from a CSV import
// @route   POST /api/payments/bulk
// @access  Private/Admin
export const bulkCreatePayments = asyncHandler(async (req, res) => {
  const { payments } = req.body;

  if (!Array.isArray(payments) || payments.length === 0) {
    res.status(400);
    throw new Error('No payment rows provided');
  }

  const created = [];
  const failed = [];

  // Processed sequentially (not Promise.all): rows can target the same invoice,
  // and each row's amount-due check must see the previous row's saved result.
  for (const row of payments) {
    const { invoiceNumber, amount, paymentMethod, transactionDate, remarks } = row;

    if (!invoiceNumber) {
      failed.push({ row, error: 'Invoice # is required' });
      continue;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      failed.push({ row, error: 'Amount must be a positive number' });
      continue;
    }
    if (!Object.values(PAYMENT_METHOD).includes(paymentMethod)) {
      failed.push({ row, error: `Invalid payment method: ${paymentMethod}` });
      continue;
    }

    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) {
      failed.push({ row, error: `Invoice not found: ${invoiceNumber}` });
      continue;
    }

    try {
      const payment = await recordPaymentForInvoice(
        invoice,
        { amount: parsedAmount, paymentMethod, transactionDate: transactionDate || undefined, remarks },
        req.user._id
      );
      created.push(payment);
      await logAudit(req, { action: 'bulk_create', entity: 'Payment', entityId: payment._id, after: snapshot(payment) });
    } catch (err) {
      failed.push({ row, error: err.message });
    }
  }

  res.status(200).json({
    success: true,
    message: `${created.length} payment(s) recorded, ${failed.length} failed`,
    data: { created, failed },
  });
});

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private/Admin
const UPDATABLE_PAYMENT_FIELDS = [
  'amount', 'paymentMethod', 'transactionId', 'transactionDate',
  'chequeNumber', 'chequeDate', 'bankName', 'status', 'remarks',
];

export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  const beforeDoc = snapshot(payment);

  // Whitelist: invoice/student/parent/numbers must never be changed through edit
  UPDATABLE_PAYMENT_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) payment[field] = req.body[field];
  });

  if (!(payment.amount > 0)) {
    res.status(400);
    throw new Error('Payment amount must be greater than zero');
  }

  // Edited payment must not push the invoice over its total
  if (payment.status === 'completed') {
    const invoice = await Invoice.findById(payment.invoice);
    const others = await Payment.find({ invoice: payment.invoice, status: 'completed', _id: { $ne: payment._id } });
    const othersTotal = others.reduce((sum, p) => sum + p.amount, 0);
    if (invoice && othersTotal + payment.amount > invoice.total) {
      res.status(400);
      throw new Error(`Payment amount exceeds amount due (${invoice.total - othersTotal})`);
    }
  }

  await payment.save();
  await recalcInvoiceStatus(payment.invoice);

  await logAudit(req, { action: 'update', entity: 'Payment', entityId: payment._id, ...diffSnapshots(beforeDoc, payment) });

  res.status(200).json({
    success: true,
    message: 'Payment updated successfully',
    data: await populatePayment(payment._id),
  });
});

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private/Admin
export const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  await payment.softDelete(req.user._id);
  await recalcInvoiceStatus(payment.invoice);

  await logAudit(req, { action: 'delete', entity: 'Payment', entityId: payment._id, before: snapshot(payment) });

  res.status(200).json({ success: true, message: 'Payment deleted successfully' });
});
