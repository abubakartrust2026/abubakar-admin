import asyncHandler from 'express-async-handler';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import { PAYMENT_METHOD } from '../config/constants.js';

// Records a single payment against an already-fetched invoice, validating the
// amount against what's currently due and updating the invoice's paid status.
// Shared by createPayment (single) and bulkCreatePayments (CSV import) so both
// paths apply identical business rules.
const recordPaymentForInvoice = async (invoice, paymentData, userId) => {
  const existingPayments = await Payment.find({ invoice: invoice._id, status: 'completed' });
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = invoice.total - totalPaid;

  if (paymentData.amount > amountDue) {
    throw new Error(`Payment amount exceeds amount due (${amountDue})`);
  }

  const payment = await Payment.create({
    ...paymentData,
    invoice: invoice._id,
    student: invoice.student,
    parent: invoice.parent,
    receivedBy: userId,
  });

  const newTotalPaid = totalPaid + paymentData.amount;
  if (newTotalPaid >= invoice.total) {
    invoice.status = 'paid';
  } else if (newTotalPaid > 0) {
    invoice.status = 'partially_paid';
  }
  await invoice.save();

  return Payment.findById(payment._id)
    .populate('student', 'firstName lastName class admissionNumber')
    .populate('parent', 'firstName lastName email')
    .populate('invoice', 'invoiceNumber total');
};

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