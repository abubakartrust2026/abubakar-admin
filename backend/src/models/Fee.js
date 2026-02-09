import mongoose from 'mongoose';
import { FEE_FREQUENCY } from '../config/constants.js';

const feeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Fee name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Fee amount is required'],
      min: [0, 'Fee amount cannot be negative'],
    },
    frequency: {
      type: String,
      enum: Object.values(FEE_FREQUENCY),
      required: [true, 'Fee frequency is required'],
    },
    applicableFor: {
      classes: [String], // e.g., ["1", "2", "3", "all"]
      academicYear: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
feeSchema.index({ isActive: 1 });
feeSchema.index({ 'applicableFor.classes': 1 });

const Fee = mongoose.model('Fee', feeSchema);

export default Fee;
