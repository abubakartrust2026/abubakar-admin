import dotenv from 'dotenv';
import Invoice from '../models/Invoice.js';
import connectDB from '../config/db.js';

dotenv.config();

// Marks INV-2026-00001 through INV-2026-00053 as paid.
// These invoices had their remaining balances settled outside the system.
const START = 1;
const END = 53;
const YEAR = 2026;

const invoiceNumbers = Array.from(
  { length: END - START + 1 },
  (_, i) => `INV-${YEAR}-${String(START + i).padStart(5, '0')}`
);

const markInvoicesPaid = async () => {
  try {
    await connectDB();

    const result = await Invoice.updateMany(
      { invoiceNumber: { $in: invoiceNumbers } },
      { $set: { status: 'paid' } }
    );

    console.log(`Matched ${result.matchedCount} invoice(s), updated ${result.modifiedCount} to status "paid".`);
    console.log(
      'Note: this only updates the invoice status field. It does not create Payment records, ' +
      'so amountPaid/amountDue figures derived from the Payment collection may still reflect the ' +
      'original unpaid breakdown unless payment records are backfilled separately.'
    );

    process.exit(0);
  } catch (error) {
    console.error('Error marking invoices paid:', error.message);
    process.exit(1);
  }
};

markInvoicesPaid();
