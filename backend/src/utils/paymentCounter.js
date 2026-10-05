import mongoose from 'mongoose';
import { Counter } from '../models/Counter.js';

const COUNTER_ID = 'paymentNumber';

// Highest numeric suffix among existing payment numbers (PAY-YYYY-NNNNN)
const getMaxExistingSeq = async () => {
  const result = await mongoose.model('Payment').aggregate([
    { $match: { paymentNumber: /^PAY-\d{4}-\d+$/ } },
    { $project: { seq: { $toInt: { $arrayElemAt: [{ $split: ['$paymentNumber', '-'] }, 2] } } } },
    { $group: { _id: null, maxSeq: { $max: '$seq' } } },
  ]);
  return result[0]?.maxSeq ?? 0;
};

// Atomic next payment sequence. Seeds the counter from existing data on first use.
export const nextPaymentSeq = async () => {
  const exists = await Counter.exists({ _id: COUNTER_ID });
  if (!exists) {
    const base = await getMaxExistingSeq();
    try {
      await Counter.updateOne({ _id: COUNTER_ID }, { $setOnInsert: { seq: base } }, { upsert: true });
    } catch (err) {
      if (err.code !== 11000) throw err; // another request seeded it first
    }
  }
  const counter = await Counter.findOneAndUpdate({ _id: COUNTER_ID }, { $inc: { seq: 1 } }, { new: true });
  return counter.seq;
};
