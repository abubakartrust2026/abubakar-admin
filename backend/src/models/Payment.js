import mongoose from 'mongoose';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../config/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: [true, 'Payment number is required'],
      unique: true,
      trim: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Parent reference is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: [true, 'Payment method is required'],
    },
    transactionId: {
      type: String,
      trim: true,
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
    },
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
      unique: true,
      trim: true,
    },
    chequeNumber: {
      type: String,
      trim: true,
    },
    chequeDate: {
      type: Date,
    },
    bankName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.COMPLETED,
    },
    remarks: {
      type: String,
      trim: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate payment and receipt numbers before saving
paymentSchema.pre('save', async function (next) {
  if (!this.paymentNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    const year = new Date().getFullYear();
    this.paymentNumber = `PAY-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  if (!this.receiptNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    const year = new Date().getFullYear();
    this.receiptNumber = `REC-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  next();
});

// Indexes
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ receiptNumber: 1 });
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ student: 1 });
paymentSchema.index({ parent: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionDate: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
