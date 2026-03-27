import mongoose from 'mongoose';

const ITEM_CATEGORY = ['books', 'drawing_book', 'uniform', 'notebooks', 'scarf_cap', 'other'];

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ITEM_CATEGORY,
      required: [true, 'Category is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

inventoryItemSchema.virtual('totalValue').get(function () {
  return this.quantity * this.unitPrice;
});

inventoryItemSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ isActive: 1 });

export const INVENTORY_CATEGORIES = ITEM_CATEGORY;
const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export default InventoryItem;
