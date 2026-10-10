import Invoice from '../models/Invoice.js';
import { Counter } from '../models/Counter.js';

// Uses the raw collection so soft-deleted invoices (whose numbers still occupy
// the unique index) are counted, and only ever moves the counter forward.
export async function syncInvoiceCounter() {
  const result = await Invoice.collection
    .aggregate([
      { $match: { invoiceNumber: /^INV-\d{4}-\d+$/ } },
      {
        $project: {
          seq: { $toInt: { $arrayElemAt: [{ $split: ['$invoiceNumber', '-'] }, 2] } },
        },
      },
      { $group: { _id: null, maxSeq: { $max: '$seq' } } },
    ])
    .toArray();
  const maxSeq = result[0]?.maxSeq ?? 0;
  if (maxSeq > 0) {
    try {
      await Counter.findOneAndUpdate(
        { _id: 'invoiceNumber', seq: { $lt: maxSeq } },
        { $set: { seq: maxSeq } },
        { upsert: true }
      );
    } catch (err) {
      // Upsert on an existing counter that is already >= maxSeq hits a duplicate _id; that's fine.
      if (Number(err.code) !== 11000) throw err;
    }
  }
  return maxSeq;
}
