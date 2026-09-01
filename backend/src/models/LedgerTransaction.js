import mongoose from 'mongoose';
import { LEDGER_TRANSACTION_TYPE, INCOME_CATEGORY, EXPENSE_CATEGORY, LEDGER_PAYMENT_MODE } from '../config/constants.js';

const ledgerTransactionSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution reference is required'],
    },
    financialYear: {
      type: String,
      required: [true, 'Financial year is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(LEDGER_TRANSACTION_TYPE),
      required: [true, 'Transaction type is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    paymentMode: {
      type: String,
      enum: Object.values(LEDGER_PAYMENT_MODE),
    },
    referenceNo: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

ledgerTransactionSchema.pre('validate', function (next) {
  const validCategories =
    this.type === LEDGER_TRANSACTION_TYPE.INCOME
      ? Object.values(INCOME_CATEGORY)
      : Object.values(EXPENSE_CATEGORY);

  if (!validCategories.includes(this.category)) {
    return next(new Error(`Invalid category "${this.category}" for type "${this.type}"`));
  }
  next();
});

ledgerTransactionSchema.index({ institution: 1, financialYear: 1, date: -1 });
ledgerTransactionSchema.index({ type: 1, category: 1 });
ledgerTransactionSchema.index({ date: -1 });

const LedgerTransaction = mongoose.model('LedgerTransaction', ledgerTransactionSchema);

export default LedgerTransaction;
