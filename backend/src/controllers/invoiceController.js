import asyncHandler from 'express-async-handler';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { Counter } from '../models/Counter.js';

async function syncInvoiceCounter() {
  const invoices = await Invoice.find(
    { invoiceNumber: /^INV-\d{4}-\d+$/ },
    { invoiceNumber: 1 }
  ).lean();
  let maxSeq = 0;
  for (const inv of invoices) {
    const parts = inv.invoiceNumber.split('-');
    const seq = parseInt(parts[2], 10);
    if (seq > maxSeq) maxSeq = seq;
  }
  if (maxSeq > 0) {
    await Counter.findOneAndUpdate(
      { _id: 'invoiceNumber' },
      { $max: { seq: maxSeq } },
      { upsert: true }
    );
  }
  return maxSeq;
}

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = asyncHandler(async (req, res) => {
  const { status, studentId, parentId, page = 1, limit = 10 } = req.query;
  const query = {};

  if (status) query.status = status;
  if (studentId) query.student = studentId;
  if (parentId) query.parent = parentId;

  // Parents can only view their own invoices
  if (req.user.role === 'parent') {
    query.parent = req.user._id;
  }

  const total = await Invoice.countDocuments(query);
  const invoices = await Invoice.find(query)
    .populate('student', 'firstName lastName class section admissionNumber')
    .populate('parent', 'firstName lastName email phone')
    .populate('items.fee', 'name')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: invoices,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('student', 'firstName lastName class section admissionNumber')
    .populate('parent', 'firstName lastName email phone address')
    .populate('items.fee', 'name frequency');

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Parents can only view their own invoices
  if (req.user.role === 'parent' && invoice.parent._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this invoice');
  }

  // Get payments for this invoice
  const payments = await Payment.find({ invoice: invoice._id, status: 'completed' });
  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  res.status(200).json({
    success: true,
    data: {
      ...invoice.toObject(),
      amountPaid,
      amountDue: invoice.total - amountPaid,
    },
  });
});

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private/Admin
export const createInvoice = asyncHandler(async (req, res) => {
  const { items, tax = 0, discount = 0 } = req.body;

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal + tax - discount;

  let invoice;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = { ...req.body, subtotal, total };
      delete data.invoiceNumber; // always let the pre-validate hook generate it
      invoice = await Invoice.create(data);
      break;
    } catch (err) {
      if (err.code === 11000 && err.keyValue?.invoiceNumber) {
        await syncInvoiceCounter();
        lastError = err;
      } else {
        throw err;
      }
    }
  }
  if (!invoice) throw lastError;

  const populated = await Invoice.findById(invoice._id)
    .populate('student', 'firstName lastName class section admissionNumber')
    .populate('parent', 'firstName lastName email phone');

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: populated,
  });
});

// @desc    Sync invoice counter with max existing sequence
// @route   POST /api/invoices/sync-counter
// @access  Private/Admin
export const syncCounter = asyncHandler(async (req, res) => {
  const maxSeq = await syncInvoiceCounter();
  const counter = await Counter.findById('invoiceNumber').lean();
  res.status(200).json({
    success: true,
    message: 'Counter synced',
    data: { maxSeqFound: maxSeq, counterSeq: counter?.seq ?? 0 },
  });
});

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private/Admin
export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Recalculate totals if items changed
  if (req.body.items) {
    req.body.subtotal = req.body.items.reduce((sum, item) => sum + item.amount, 0);
    req.body.total = req.body.subtotal + (req.body.tax || invoice.tax) - (req.body.discount || invoice.discount);
  }

  const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('student', 'firstName lastName class section admissionNumber')
    .populate('parent', 'firstName lastName email phone');

  res.status(200).json({
    success: true,
    message: 'Invoice updated successfully',
    data: updated,
  });
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Check if invoice has payments
  const payments = await Payment.find({ invoice: invoice._id });
  if (payments.length > 0) {
    res.status(400);
    throw new Error('Cannot delete invoice with existing payments');
  }

  await Invoice.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Invoice deleted successfully',
  });
});