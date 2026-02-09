import mongoose from 'mongoose';
import { INVOICE_STATUS } from '../config/constants.js';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
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
    items: [
      {
        fee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Fee',
        },
        description: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: 0,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.PENDING,
    },
    academicYear: {
      type: String,
      required: true,
    },
    term: {
      type: String, // e.g., "Q1 2026", "Term 1"
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate invoice number before validation
invoiceSchema.pre('validate', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Method to check if invoice is overdue
invoiceSchema.methods.isOverdue = function () {
  return (
    this.status === INVOICE_STATUS.PENDING &&
    new Date() > this.dueDate
  );
};

// Method to calculate amount paid
invoiceSchema.methods.getAmountPaid = async function () {
  const Payment = mongoose.model('Payment');
  const payments = await Payment.find({
    invoice: this._id,
    status: 'completed',
  });
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
};

// Method to calculate amount due
invoiceSchema.methods.getAmountDue = async function () {
  const paid = await this.getAmountPaid();
  return this.total - paid;
};

// Indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ student: 1 });
invoiceSchema.index({ parent: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
