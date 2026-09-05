import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import LedgerTransaction from '../models/LedgerTransaction.js';
import Institution from '../models/Institution.js';
import OpeningBalance from '../models/OpeningBalance.js';
import { LEDGER_TRANSACTION_TYPE } from '../config/constants.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// @desc    Get ledger transactions
// @route   GET /api/ledger/transactions
// @access  Private/Admin
export const getTransactions = asyncHandler(async (req, res) => {
  const {
    institution,
    financialYear,
    type,
    category,
    month,
    search,
    page = 1,
    limit = 20,
    sortBy = 'date',
    sortOrder = 'desc',
  } = req.query;

  const query = {};
  if (institution && institution !== 'all') query.institution = institution;
  if (financialYear) query.financialYear = financialYear;
  if (type) query.type = type;
  if (category) query.category = category;

  if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    query.date = { $gte: start, $lt: end };
  }

  if (search) {
    const searchRegex = escapeRegex(search);
    query.$or = [
      { description: { $regex: searchRegex, $options: 'i' } },
      { referenceNo: { $regex: searchRegex, $options: 'i' } },
      { remarks: { $regex: searchRegex, $options: 'i' } },
    ];
  }

  const total = await LedgerTransaction.countDocuments(query);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const transactions = await LedgerTransaction.find(query)
    .populate('institution', 'name shortName')
    .populate('createdBy', 'firstName lastName')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort(sort);

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get transaction by ID
// @route   GET /api/ledger/transactions/:id
// @access  Private/Admin
export const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await LedgerTransaction.findById(req.params.id).populate('institution', 'name shortName');

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  res.status(200).json({
    success: true,
    data: transaction,
  });
});

// @desc    Create ledger transaction
// @route   POST /api/ledger/transactions
// @access  Private/Admin
export const createTransaction = asyncHandler(async (req, res) => {
  const transaction = await LedgerTransaction.create({
    ...req.body,
    createdBy: req.user._id,
  });

  const populated = await LedgerTransaction.findById(transaction._id).populate('institution', 'name shortName');

  res.status(201).json({
    success: true,
    message: 'Transaction added successfully',
    data: populated,
  });
});

// @desc    Update ledger transaction
// @route   PUT /api/ledger/transactions/:id
// @access  Private/Admin
export const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await LedgerTransaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  const updated = await LedgerTransaction.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  ).populate('institution', 'name shortName');

  res.status(200).json({
    success: true,
    message: 'Transaction updated successfully',
    data: updated,
  });
});

// @desc    Delete ledger transaction
// @route   DELETE /api/ledger/transactions/:id
// @access  Private/Admin
export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await LedgerTransaction.findById(req.params.id);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  await LedgerTransaction.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Transaction deleted successfully',
  });
});

// Helper: sum opening balance(s) for an institution scope + financial year
const getOpeningBalanceTotal = async (institution, financialYear) => {
  if (institution && institution !== 'all') {
    const ob = await OpeningBalance.findOne({ institution, financialYear });
    return ob?.amount || 0;
  }
  const activeInstitutions = await Institution.find({ isActive: true }).select('_id');
  const balances = await OpeningBalance.find({
    institution: { $in: activeInstitutions.map((i) => i._id) },
    financialYear,
  });
  return balances.reduce((sum, b) => sum + b.amount, 0);
};

// @desc    Get dashboard summary (opening/income/expense/closing) for an institution scope
// @route   GET /api/ledger/dashboard
// @access  Private/Admin
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const { institution, financialYear } = req.query;

  if (!financialYear) {
    res.status(400);
    throw new Error('financialYear is required');
  }

  const opening = await getOpeningBalanceTotal(institution, financialYear);

  const match = { financialYear };
  if (institution && institution !== 'all') {
    match.institution = new mongoose.Types.ObjectId(institution);
  }

  const totals = await LedgerTransaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const income = totals.find((t) => t._id === LEDGER_TRANSACTION_TYPE.INCOME)?.total || 0;
  const expense = totals.find((t) => t._id === LEDGER_TRANSACTION_TYPE.EXPENSE)?.total || 0;
  const closing = opening + income - expense;

  res.status(200).json({
    success: true,
    data: { opening, income, expense, closing },
  });
});

// @desc    Get all-institution comparison table for a financial year
// @route   GET /api/ledger/comparison
// @access  Private/Admin
export const getInstitutionComparison = asyncHandler(async (req, res) => {
  const { financialYear } = req.query;

  if (!financialYear) {
    res.status(400);
    throw new Error('financialYear is required');
  }

  const institutions = await Institution.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  const institutionIds = institutions.map((i) => i._id);

  const openingBalances = await OpeningBalance.find({
    institution: { $in: institutionIds },
    financialYear,
  });
  const openingMap = {};
  openingBalances.forEach((b) => {
    openingMap[b.institution.toString()] = b.amount;
  });

  const totals = await LedgerTransaction.aggregate([
    { $match: { institution: { $in: institutionIds }, financialYear } },
    { $group: { _id: { institution: '$institution', type: '$type' }, total: { $sum: '$amount' } } },
  ]);

  const totalsMap = {};
  totals.forEach((t) => {
    const key = t._id.institution.toString();
    if (!totalsMap[key]) totalsMap[key] = { income: 0, expense: 0 };
    totalsMap[key][t._id.type] = t.total;
  });

  const data = institutions.map((inst) => {
    const key = inst._id.toString();
    const opening = openingMap[key] || 0;
    const income = totalsMap[key]?.income || 0;
    const expense = totalsMap[key]?.expense || 0;
    const closing = opening + income - expense;
    return {
      institution: { _id: inst._id, name: inst.name, shortName: inst.shortName },
      opening,
      income,
      expense,
      closing,
    };
  });

  const grandTotal = data.reduce(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      income: acc.income + row.income,
      expense: acc.expense + row.expense,
      closing: acc.closing + row.closing,
    }),
    { opening: 0, income: 0, expense: 0, closing: 0 }
  );

  res.status(200).json({
    success: true,
    data,
    grandTotal,
  });
});

// @desc    Get monthly summary (running opening->closing balance per month)
// @route   GET /api/ledger/monthly-summary
// @access  Private/Admin
export const getMonthlySummary = asyncHandler(async (req, res) => {
  const { institution, financialYear } = req.query;

  if (!financialYear) {
    res.status(400);
    throw new Error('financialYear is required');
  }

  const match = { financialYear };
  if (institution && institution !== 'all') {
    match.institution = new mongoose.Types.ObjectId(institution);
  }

  const monthly = await LedgerTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  const monthMap = {};
  monthly.forEach((m) => {
    const key = m._id.month;
    if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 };
    monthMap[key][m._id.type] = m.total;
  });

  let runningOpening = await getOpeningBalanceTotal(institution, financialYear);

  const data = Object.keys(monthMap)
    .sort()
    .map((month) => {
      const income = monthMap[month].income || 0;
      const expense = monthMap[month].expense || 0;
      const opening = runningOpening;
      const closing = opening + income - expense;
      runningOpening = closing;
      return { month, opening, income, expense, closing };
    });

  res.status(200).json({
    success: true,
    data,
  });
});

// @desc    Get category breakdown (income or expense) for an institution scope
// @route   GET /api/ledger/breakdown
// @access  Private/Admin
export const getCategoryBreakdown = asyncHandler(async (req, res) => {
  const { institution, financialYear, type } = req.query;

  if (!financialYear || !type) {
    res.status(400);
    throw new Error('financialYear and type are required');
  }

  const match = { financialYear, type };
  if (institution && institution !== 'all') {
    match.institution = new mongoose.Types.ObjectId(institution);
  }

  const breakdown = await LedgerTransaction.aggregate([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: breakdown.map((b) => ({ category: b._id, total: b.total })),
  });
});

// @desc    Export ledger transactions to Excel
// @route   GET /api/ledger/export
// @access  Private/Admin
export const exportTransactions = asyncHandler(async (req, res) => {
  const { institution, financialYear } = req.query;

  if (!financialYear) {
    res.status(400);
    throw new Error('financialYear is required');
  }

  const query = { financialYear };
  if (institution && institution !== 'all') query.institution = institution;

  const transactions = await LedgerTransaction.find(query)
    .populate('institution', 'name shortName')
    .sort({ date: -1 });

  const wb = XLSX.utils.book_new();

  const rows = transactions.map((t) => ({
    Date: t.date.toISOString().split('T')[0],
    Institution: t.institution?.name || '',
    Type: t.type,
    'Source / Category': t.category,
    Amount: t.amount,
    'Payment Mode': t.paymentMode || '',
    'Reference No': t.referenceNo || '',
    Description: t.description,
    Remarks: t.remarks || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  if (!institution || institution === 'all') {
    const institutions = await Institution.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    institutions.forEach((inst) => {
      const instRows = transactions
        .filter((t) => t.institution?._id.toString() === inst._id.toString())
        .map((t) => ({
          Date: t.date.toISOString().split('T')[0],
          Type: t.type,
          'Source / Category': t.category,
          Amount: t.amount,
          Description: t.description,
          Remarks: t.remarks || '',
        }));
      const sheetName = (inst.shortName || inst.name).substring(0, 31);
      const instWs = XLSX.utils.json_to_sheet(instRows);
      XLSX.utils.book_append_sheet(wb, instWs, sheetName);
    });
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = `Ledger_${institution && institution !== 'all' ? institution : 'AllInstitutions'}_${financialYear}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
});
