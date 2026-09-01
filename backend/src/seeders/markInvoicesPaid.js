import dotenv from 'dotenv';
import Invoice from '../models/Invoice.js';
import connectDB from '../config/db.js';

dotenv.config();

const START = 1;
const END = 53;
const YEAR = '2026';

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

    console.log(`Matched ${result.matchedCount} invoices, updated ${result.modifiedCount} to status "paid".`);
    console.log('Note: this only updates the status field. It does not create Payment records, so amountPaid/amountDue shown in the invoice view will still reflect the original balance unless payments are backfilled separately.');

    process.exit(0);
  } catch (error) {
    console.error('Error marking invoices paid:', error.message);
    process.exit(1);
  }
};

markInvoicesPaid();
