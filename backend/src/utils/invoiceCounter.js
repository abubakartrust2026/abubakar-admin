import Invoice from '../models/Invoice.js';
import { Counter } from '../models/Counter.js';

export async function syncInvoiceCounter() {
  const result = await Invoice.aggregate([
    { $match: { invoiceNumber: /^INV-\d{4}-\d+$/ } },
    {
      $project: {
        seq: { $toInt: { $arrayElemAt: [{ $split: ['$invoiceNumber', '-'] }, 2] } },
      },
    },
    { $group: { _id: null, maxSeq: { $max: '$seq' } } },
  ]);
  const maxSeq = result[0]?.maxSeq ?? 0;
  if (maxSeq > 0) {
    await Counter.findOneAndUpdate(
      { _id: 'invoiceNumber' },
      { $set: { seq: maxSeq } },
      { upsert: true }
    );
  }
  return maxSeq;
}
