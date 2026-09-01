import asyncHandler from 'express-async-handler';
import OpeningBalance from '../models/OpeningBalance.js';
import Institution from '../models/Institution.js';

// @desc    Get opening balance for an institution + financial year
// @route   GET /api/opening-balances
// @access  Private/Admin
export const getOpeningBalance = asyncHandler(async (req, res) => {
  const { institution, financialYear } = req.query;

  if (!institution || !financialYear) {
    res.status(400);
    throw new Error('institution and financialYear are required');
  }

  const openingBalance = await OpeningBalance.findOne({ institution, financialYear });

  res.status(200).json({
    success: true,
    data: openingBalance || { institution, financialYear, amount: 0 },
  });
});

// @desc    Create or update opening balance for an institution + financial year
// @route   PUT /api/opening-balances
// @access  Private/Admin
export const upsertOpeningBalance = asyncHandler(async (req, res) => {
  const { institution, financialYear, amount, notes } = req.body;

  if (!institution || !financialYear) {
    res.status(400);
    throw new Error('institution and financialYear are required');
  }

  const updated = await OpeningBalance.findOneAndUpdate(
    { institution, financialYear },
    { amount, notes, setBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Opening balance saved successfully',
    data: updated,
  });
});

// @desc    Get opening balances for all active institutions for a financial year
// @route   GET /api/opening-balances/by-year/:financialYear
// @access  Private/Admin
export const getAllOpeningBalancesForYear = asyncHandler(async (req, res) => {
  const { financialYear } = req.params;

  const institutions = await Institution.find({ isActive: true }).select('_id name shortName');
  const balances = await OpeningBalance.find({ financialYear });

  const balanceMap = {};
  balances.forEach((b) => {
    balanceMap[b.institution.toString()] = b.amount;
  });

  const data = institutions.map((inst) => ({
    institution: { _id: inst._id, name: inst.name, shortName: inst.shortName },
    amount: balanceMap[inst._id.toString()] || 0,
  }));

  res.status(200).json({
    success: true,
    data,
  });
});
