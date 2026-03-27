import asyncHandler from 'express-async-handler';
import InventoryItem from '../models/InventoryItem.js';

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private/Admin
export const getInventoryItems = asyncHandler(async (req, res) => {
  const { category, active } = req.query;
  const query = {};

  if (category) query.category = category;
  if (active !== undefined) query.isActive = active === 'true';

  const items = await InventoryItem.find(query).sort({ category: 1, name: 1 });

  res.status(200).json({ success: true, data: items });
});

// @desc    Get inventory item by ID
// @route   GET /api/inventory/:id
// @access  Private/Admin
export const getInventoryItemById = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error('Inventory item not found');
  }

  res.status(200).json({ success: true, data: item });
});

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private/Admin
export const createInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Inventory item created successfully',
    data: item,
  });
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private/Admin
export const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error('Inventory item not found');
  }

  const updated = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Inventory item updated successfully',
    data: updated,
  });
});

// @desc    Adjust stock quantity (add or subtract)
// @route   PATCH /api/inventory/:id/stock
// @access  Private/Admin
export const adjustStock = asyncHandler(async (req, res) => {
  const { adjustment } = req.body; // positive = add, negative = subtract

  if (adjustment === undefined || isNaN(adjustment)) {
    res.status(400);
    throw new Error('Adjustment value is required');
  }

  const item = await InventoryItem.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error('Inventory item not found');
  }

  const newQuantity = item.quantity + parseInt(adjustment);
  if (newQuantity < 0) {
    res.status(400);
    throw new Error('Insufficient stock');
  }

  item.quantity = newQuantity;
  await item.save();

  res.status(200).json({
    success: true,
    message: 'Stock adjusted successfully',
    data: item,
  });
});

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);

  if (!item) {
    res.status(404);
    throw new Error('Inventory item not found');
  }

  await InventoryItem.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Inventory item deleted successfully',
  });
});
