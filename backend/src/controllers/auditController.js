import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import LedgerTransaction from '../models/LedgerTransaction.js';
import Attendance from '../models/Attendance.js';
import Fee from '../models/Fee.js';
import InventoryItem from '../models/InventoryItem.js';
import Institution from '../models/Institution.js';
import { parsePagination } from '../utils/queryHelpers.js';
import { logAudit, snapshot } from '../utils/audit.js';

const TRASH_MODELS = {
  payments: { model: Payment, entity: 'Payment' },
  invoices: { model: Invoice, entity: 'Invoice' },
  students: { model: Student, entity: 'Student' },
  'ledger-transactions': { model: LedgerTransaction, entity: 'LedgerTransaction' },
  attendance: { model: Attendance, entity: 'Attendance' },
  fees: { model: Fee, entity: 'Fee' },
  users: { model: User, entity: 'User' },
  inventory: { model: InventoryItem, entity: 'InventoryItem' },
  institutions: { model: Institution, entity: 'Institution' },
};

const resolveEntity = (res, key) => {
  const cfg = TRASH_MODELS[key];
  if (!cfg) {
    res.status(400);
    throw new Error(`Unknown entity "${key}". Use one of: ${Object.keys(TRASH_MODELS).join(', ')}`);
  }
  return cfg;
};

// @desc    Query the audit trail
// @route   GET /api/audit-logs?entity=&entityId=&actor=&action=&startDate=&endDate=
// @access  Private/Admin
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { entity, entityId, actor, action, startDate, endDate } = req.query;
  const { page, limit, skip } = parsePagination(req.query, 25, 200);
  const query = {};

  if (entity) query.entity = entity;
  if (entityId) query.entityId = entityId;
  if (actor) query.actor = actor;
  if (action) query.action = action;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .populate('actor', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: logs,
    pagination: { total, page, pages: Math.ceil(total / limit) },
  });
});

// @desc    List soft-deleted records
// @route   GET /api/audit-logs/trash/:entity
// @access  Private/Admin
export const getTrash = asyncHandler(async (req, res) => {
  const { model } = resolveEntity(res, req.params.entity);
  const { page, limit, skip } = parsePagination(req.query, 25, 200);

  const query = { isDeleted: true };
  const total = await model.countDocuments(query).setOptions({ withDeleted: true });
  const items = await model.find(query)
    .setOptions({ withDeleted: true })
    .populate('deletedBy', 'firstName lastName')
    .sort({ deletedAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: items,
    pagination: { total, page, pages: Math.ceil(total / limit) },
  });
});

// Restoring a record whose parent is still deleted would leave it orphaned; refuse that.
const assertParentsExist = async (res, key, doc) => {
  const fail = (msg) => {
    res.status(400);
    throw new Error(msg);
  };
  if (key === 'payments' && !(await Invoice.exists({ _id: doc.invoice }))) {
    fail('Restore the invoice first — this payment belongs to a deleted invoice');
  }
  if (key === 'attendance' && !(await Student.exists({ _id: doc.student }))) {
    fail('Restore the student first — this attendance record belongs to a deleted student');
  }
  if (key === 'ledger-transactions' && !(await Institution.exists({ _id: doc.institution }))) {
    fail('Restore the institution first — this transaction belongs to a deleted institution');
  }
  if (key === 'invoices' && !(await Student.exists({ _id: doc.student }))) {
    fail('Restore the student first — this invoice belongs to a deleted student');
  }
};

// @desc    Restore a soft-deleted record
// @route   POST /api/audit-logs/trash/:entity/:id/restore
// @access  Private/Admin
export const restoreRecord = asyncHandler(async (req, res) => {
  const { entity: key, id } = req.params;
  const { model, entity } = resolveEntity(res, key);

  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid id');
  }

  const doc = await model.findOne({ _id: id, isDeleted: true }).setOptions({ withDeleted: true });
  if (!doc) {
    res.status(404);
    throw new Error('Deleted record not found');
  }

  await assertParentsExist(res, key, doc);
  await doc.restore();

  // Re-link restored student to its parent and bring the invoice status back in line with payments
  if (key === 'students' && doc.parent) {
    await User.findByIdAndUpdate(doc.parent, { $addToSet: { children: doc._id } });
  }
  if (key === 'payments') {
    const invoice = await Invoice.findById(doc.invoice);
    if (invoice && invoice.status !== 'cancelled') {
      const paid = (await Payment.find({ invoice: invoice._id, status: 'completed' }))
        .reduce((sum, p) => sum + p.amount, 0);
      invoice.status = paid >= invoice.total ? 'paid' : paid > 0 ? 'partially_paid' : invoice.status;
      await invoice.save();
    }
  }

  await logAudit(req, { action: 'restore', entity, entityId: doc._id, after: snapshot(doc) });

  res.status(200).json({ success: true, message: `${entity} restored successfully`, data: doc });
});
