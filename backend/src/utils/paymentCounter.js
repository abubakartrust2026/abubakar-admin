import Payment from '../models/Payment.js';
import { Counter } from '../models/Counter.js';

// Brings the paymentNumber counter up to the highest sequence already used by
// any payment (including soft-deleted ones), so the next generated number can't collide.
export async function syncPaymentCounter() {
  const result = await Payment.collection
    .aggregate([
      { $match: { paymentNumber: /^PAY-\d{4}-\d+$/ } },
      {
        $project: {
          seq: { $toInt: { $arrayElemAt: [{ $split: ['$paymentNumber', '-'] }, 2] } },
        },
      },
      { $group: { _id: null, maxSeq: { $max: '$seq' } } },
    ])
    .toArray();
  const maxSeq = result[0]?.maxSeq ?? 0;
  if (maxSeq > 0) {
    await Counter.findOneAndUpdate(
      { _id: 'paymentNumber', seq: { $lt: maxSeq } },
      { $set: { seq: maxSeq } }
    );
  }
  return maxSeq;
}
