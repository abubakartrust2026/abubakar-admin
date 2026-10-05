import asyncHandler from 'express-async-handler';
import { logAudit, snapshot, diffSnapshots } from '../utils/audit.js';
import Institution from '../models/Institution.js';
import LedgerTransaction from '../models/LedgerTransaction.js';
import OpeningBalance from '../models/OpeningBalance.js';

// @desc    Get all institutions
// @route   GET /api/institutions
// @access  Private/Admin
export const getInstitutions = asyncHandler(async (req, res) => {
  const { isActive } = req.query;
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const institutions = await Institution.find(query).sort({ sortOrder: 1, name: 1 });

  res.status(200).json({
    success: true,
    data: institutions,
  });
});

// @desc    Get institution by ID
// @route   GET /api/institutions/:id
// @access  Private/Admin
export const getInstitutionById = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);

  if (!institution) {
    res.status(404);
    throw new Error('Institution not found');
  }

  res.status(200).json({
    success: true,
    data: institution,
  });
});

// @desc    Create institution
// @route   POST /api/institutions
// @access  Private/Admin
export const createInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.create({
    ...req.body,
    createdBy: req.user._id,
  });

  await logAudit(req, { action: 'create', entity: 'Institution', entityId: institution._id, after: snapshot(institution) });

  res.status(201).json({
    success: true,
    message: 'Institution created successfully',
    data: institution,
  });
});

// @desc    Update institution
// @route   PUT /api/institutions/:id
// @access  Private/Admin
export const updateInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);

  if (!institution) {
    res.status(404);
    throw new Error('Institution not found');
  }

  const beforeDoc = snapshot(institution);

  const updated = await Institution.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  await logAudit(req, { action: 'update', entity: 'Institution', entityId: institution._id, ...diffSnapshots(beforeDoc, updated) });

  res.status(200).json({
    success: true,
    message: 'Institution updated successfully',
    data: updated,
  });
});

// @desc    Delete institution
// @route   DELETE /api/institutions/:id
// @access  Private/Admin
export const deleteInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);

  if (!institution) {
    res.status(404);
    throw new Error('Institution not found');
  }

  const hasTransactions = await LedgerTransaction.exists({ institution: institution._id });
  const hasOpeningBalances = await OpeningBalance.exists({ institution: institution._id });

  if (hasTransactions || hasOpeningBalances) {
    res.status(400);
    throw new Error('Cannot delete institution with existing transactions or opening balances. Deactivate it instead.');
  }

  await institution.softDelete(req.user._id);
  await logAudit(req, { action: 'delete', entity: 'Institution', entityId: institution._id, before: snapshot(institution) });

  res.status(200).json({
    success: true,
    message: 'Institution deleted successfully',
  });
});
