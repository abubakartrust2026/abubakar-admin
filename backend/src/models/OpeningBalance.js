import mongoose from 'mongoose';

const openingBalanceSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

openingBalanceSchema.index({ institution: 1, financialYear: 1 }, { unique: true });

const OpeningBalance = mongoose.model('OpeningBalance', openingBalanceSchema);

export default OpeningBalance;
