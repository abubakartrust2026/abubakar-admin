import asyncHandler from 'express-async-handler';
import { logAudit, snapshot, diffSnapshots } from '../utils/audit.js';
import { escapeRegex, parsePagination } from '../utils/queryHelpers.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import { syncInvoiceCounter } from '../utils/invoiceCounter.js';

// Validates line items and computes subtotal/total. Sets 400 and throws on bad input.
const calculateTotals = (res, items, tax, discount) => {
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Invoice must have at least one item');
  }
  if (items.some((item) => !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0)) {
    res.status(400);
    throw new Error('Invoice item amounts must be valid non-negative numbers');
  }
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const total = subtotal + tax - discount;
  if (total < 0) {
    res.status(400);
    throw new Error('Discount cannot exceed the invoice subtotal');
  }
  return { subtotal, total };
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = asyncHandler(async (req, res) => {
  const { status, studentId, parentId, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 10);
  const query = {};

  if (status) query.status = status;
  if (studentId) query.student = studentId;
  if (parentId) query.parent = parentId;

  if (search) {
    const matchingStudents = await Student.find({
      $or: [
        { firstName: { $regex: escapeRegex(search), $options: 'i' } },
        { lastName: { $regex: escapeRegex(search), $options: 'i' } },
      ],
    }).select('_id');

    query.$or = [
      { invoiceNumber: { $regex: escapeRegex(search), $options: 'i' } },
      { student: { $in: matchingStudents.map((s) => s._id) } },
    ];
  }

  // Parents can only view their own invoices
  if (req.user.role === 'parent') {
    query.parent = req.user._id;
  }

  const total = await Invoice.countDocuments(query);
  const invoices = await Invoice.find(query)
    .populate('student', 'firstName lastName class section admissionNumber')
    .populate('parent', 'firstName lastName email phone')
    .populate('items.fee', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: invoices,
    pagination: {
      total,
      page,
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
  const { items } = req.body;
  const tax = Number(req.body.tax) || 0;
  const discount = Number(req.body.discount) || 0;

  const { subtotal, total } = calculateTotals(res, items, tax, discount);

  let invoice;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = { ...req.body, tax, discount, subtotal, total };
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

  await logAudit(req, { action: 'create', entity: 'Invoice', entityId: invoice._id, after: snapshot(populated) });

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
  res.status(200).json({
    success: true,
    message: 'Counter synced',
    data: { counterSeq: maxSeq },
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
  // (also when tax/discount alone change, and keep an explicit 0)
  if (req.body.items || req.body.tax !== undefined || req.body.discount !== undefined) {
    const items = req.body.items || invoice.items;
    const tax = req.body.tax !== undefined ? Number(req.body.tax) || 0 : invoice.tax || 0;
    const discount = req.body.discount !== undefined ? Number(req.body.discount) || 0 : invoice.discount || 0;
    const { subtotal, total } = calculateTotals(res, items, tax, discount);
    req.body.tax = tax;
    req.body.discount = discount;
    req.body.subtotal = subtotal;
    req.body.total = total;
  }
  delete req.body.invoiceNumber;
  // status is derived from payments; only manual cancellation is allowed
  if (req.body.status !== 'cancelled') delete req.body.status;

  const beforeDoc = snapshot(invoice);

  const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('student', 'firstName lastName class section admissionNumber')
    .populate('parent', 'firstName lastName email phone');

  await logAudit(req, { action: 'update', entity: 'Invoice', entityId: invoice._id, ...diffSnapshots(beforeDoc, await Invoice.findById(invoice._id)) });

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

  await invoice.softDelete(req.user._id);
  await logAudit(req, { action: 'delete', entity: 'Invoice', entityId: invoice._id, before: snapshot(invoice) });

  res.status(200).json({
    success: true,
    message: 'Invoice deleted successfully',
  });
});