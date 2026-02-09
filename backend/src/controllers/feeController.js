import asyncHandler from 'express-async-handler';
import Fee from '../models/Fee.js';

// @desc    Get all fee structures
// @route   GET /api/fees
// @access  Private
export const getFees = asyncHandler(async (req, res) => {
  const { active, class: feeClass } = req.query;
  const query = {};

  if (active !== undefined) query.isActive = active === 'true';
  if (feeClass) query['applicableFor.classes'] = { $in: [feeClass, 'all'] };

  const fees = await Fee.find(query).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: fees });
});

// @desc    Get fee by ID
// @route   GET /api/fees/:id
// @access  Private
export const getFeeById = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);

  if (!fee) {
    res.status(404);
    throw new Error('Fee structure not found');
  }

  res.status(200).json({ success: true, data: fee });
});

// @desc    Create fee structure
// @route   POST /api/fees
// @access  Private/Admin
export const createFee = asyncHandler(async (req, res) => {
  const fee = await Fee.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Fee structure created successfully',
    data: fee,
  });
});

// @desc    Update fee structure
// @route   PUT /api/fees/:id
// @access  Private/Admin
export const updateFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);

  if (!fee) {
    res.status(404);
    throw new Error('Fee structure not found');
  }

  const updatedFee = await Fee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Fee structure updated successfully',
    data: updatedFee,
  });
});

// @desc    Delete fee structure
// @route   DELETE /api/fees/:id
// @access  Private/Admin
export const deleteFee = asyncHandler(async (req, res) => {
  const fee = await Fee.findById(req.params.id);

  if (!fee) {
    res.status(404);
    throw new Error('Fee structure not found');
  }

  await Fee.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Fee structure deleted successfully',
  });
});