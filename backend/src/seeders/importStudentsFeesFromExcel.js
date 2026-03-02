import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { USER_ROLES } from '../config/constants.js';

dotenv.config();

const DEFAULTS = {
  dateOfBirth: new Date(Date.UTC(2025, 0, 1)),
  admissionDate: new Date(Date.UTC(2025, 5, 1)),
  academicYear: '2025-26',
  gender: 'female',
  dueDate: new Date(Date.UTC(2026, 4, 1)),
  paymentMethod: 'cash',
};

const CLASS_MAP = {
  'JR KG': 'Jr. KG',
  'SR KG': 'Sr. KG',
  'SR KG ': 'Sr. KG',
  'I ST': '1',
  'II ND': '2',
};

const MONTH_DATES = {
  june: new Date(Date.UTC(2025, 5, 1)),
  july: new Date(Date.UTC(2025, 6, 1)),
  august: new Date(Date.UTC(2025, 7, 1)),
  september: new Date(Date.UTC(2025, 8, 1)),
  october: new Date(Date.UTC(2025, 9, 1)),
  november: new Date(Date.UTC(2025, 10, 1)),
  december: new Date(Date.UTC(2025, 11, 1)),
  january: new Date(Date.UTC(2026, 0, 1)),
  february: new Date(Date.UTC(2026, 1, 1)),
  march: new Date(Date.UTC(2026, 2, 1)),
  april: new Date(Date.UTC(2026, 3, 1)),
  may: new Date(Date.UTC(2026, 4, 1)),
};

const ONE_TIME_COMPONENT_DATES = {
  admissionFees: MONTH_DATES.june,
  kits: MONTH_DATES.june,
  miscellaneous: MONTH_DATES.june,
  firstTerm: MONTH_DATES.june,
  secondTerm: MONTH_DATES.december,
};

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function toAmount(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  if (!raw || raw === '--' || raw.toLowerCase() === 'na') return 0;
  const cleaned = raw.replace(/,/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function splitStudentName(fullName) {
  const cleaned = String(fullName || '').trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Unknown', lastName: 'Student', parts: [] };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Student', parts };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    parts,
  };
}

function deriveParentName(parts) {
  if (parts.length >= 3) {
    return {
      firstName: parts[parts.length - 2],
      lastName: parts[parts.length - 1],
    };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Parent' };
  }
  return { firstName: 'Student', lastName: 'Parent' };
}

function getHeaderRowAndMap(worksheet) {
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 12); row++) {
    const headerMap = {};
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
      const normalized = normalizeHeader(worksheet[cellRef]?.v);
      if (!normalized) continue;
      if (normalized.includes('studentname')) headerMap.studentName = col;
      else if (normalized.includes('mobileno') || normalized.includes('mobilenumber')) headerMap.mobile = col;
      else if (normalized.includes('admissionfees')) headerMap.admissionFees = col;
      else if (normalized.includes('kits')) headerMap.kits = col;
      else if (normalized.includes('miss')) headerMap.miscellaneous = col;
      else if (normalized.includes('1sttermfees')) headerMap.firstTerm = col;
      else if (normalized.includes('2ndterm')) headerMap.secondTerm = col;
      else if (normalized === 'june') headerMap.june = col;
      else if (normalized === 'july') headerMap.july = col;
      else if (normalized === 'august') headerMap.august = col;
      else if (normalized === 'september') headerMap.september = col;
      else if (normalized === 'october') headerMap.october = col;
      else if (normalized === 'november') headerMap.november = col;
      else if (normalized === 'december') headerMap.december = col;
      else if (normalized === 'january') headerMap.january = col;
      else if (normalized === 'february') headerMap.february = col;
      else if (normalized === 'march') headerMap.march = col;
      else if (normalized === 'april') headerMap.april = col;
      else if (normalized === 'may') headerMap.may = col;
      else if (normalized === 'total') headerMap.total = col;
      else if (normalized.includes('balance')) headerMap.balance = col;
    }
    if (typeof headerMap.studentName === 'number' && typeof headerMap.mobile === 'number') {
      return { headerRow: row, headerMap };
    }
  }
  return { headerRow: null, headerMap: null };
}

function getCellValue(worksheet, row, col) {
  if (typeof col !== 'number') return null;
  const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
  return worksheet[cellRef]?.v;
}

function parseSheetRows(worksheet, sheetName) {
  const { headerRow, headerMap } = getHeaderRowAndMap(worksheet);
  if (headerRow === null) {
    return [];
  }

  const parsedRows = [];
  const range = xlsx.utils.decode_range(worksheet['!ref']);

  for (let row = headerRow + 1; row <= range.e.r; row++) {
    const studentNameRaw = getCellValue(worksheet, row, headerMap.studentName);
    const studentName = String(studentNameRaw || '').trim();
    if (!studentName) continue;
    if (studentName.toLowerCase().startsWith('total')) continue;

    const mobile = normalizeMobile(getCellValue(worksheet, row, headerMap.mobile));
    if (!mobile) continue;

    const monetary = {
      admissionFees: toAmount(getCellValue(worksheet, row, headerMap.admissionFees)),
      kits: toAmount(getCellValue(worksheet, row, headerMap.kits)),
      miscellaneous: toAmount(getCellValue(worksheet, row, headerMap.miscellaneous)),
      firstTerm: toAmount(getCellValue(worksheet, row, headerMap.firstTerm)),
      secondTerm: toAmount(getCellValue(worksheet, row, headerMap.secondTerm)),
      june: toAmount(getCellValue(worksheet, row, headerMap.june)),
      july: toAmount(getCellValue(worksheet, row, headerMap.july)),
      august: toAmount(getCellValue(worksheet, row, headerMap.august)),
      september: toAmount(getCellValue(worksheet, row, headerMap.september)),
      october: toAmount(getCellValue(worksheet, row, headerMap.october)),
      november: toAmount(getCellValue(worksheet, row, headerMap.november)),
      december: toAmount(getCellValue(worksheet, row, headerMap.december)),
      january: toAmount(getCellValue(worksheet, row, headerMap.january)),
      february: toAmount(getCellValue(worksheet, row, headerMap.february)),
      march: toAmount(getCellValue(worksheet, row, headerMap.march)),
      april: toAmount(getCellValue(worksheet, row, headerMap.april)),
      may: toAmount(getCellValue(worksheet, row, headerMap.may)),
      total: toAmount(getCellValue(worksheet, row, headerMap.total)),
      balance: toAmount(getCellValue(worksheet, row, headerMap.balance)),
    };

    if (!headerMap.balance && typeof headerMap.total === 'number') {
      monetary.balance = toAmount(getCellValue(worksheet, row, headerMap.total + 1));
    }

    parsedRows.push({
      sheetName,
      className: CLASS_MAP[sheetName] || sheetName.trim(),
      studentName,
      mobile,
      monetary,
    });
  }

  return parsedRows;
}

function buildPaymentBreakdown(monetary) {
  const payments = [];

  for (const key of ['admissionFees', 'kits', 'miscellaneous', 'firstTerm', 'secondTerm']) {
    const amount = toAmount(monetary[key]);
    if (amount > 0) {
      payments.push({
        amount,
        transactionDate: ONE_TIME_COMPONENT_DATES[key],
        remarks: `Excel import: ${key}`,
      });
    }
  }

  for (const [month, date] of Object.entries(MONTH_DATES)) {
    const amount = toAmount(monetary[month]);
    if (amount > 0) {
      payments.push({
        amount,
        transactionDate: date,
        remarks: `Excel import: ${month}`,
      });
    }
  }

  return payments;
}

function nextAdmissionFactory(startFrom) {
  let counter = startFrom;
  return () => {
    if (counter > 99) {
      throw new Error('Admission sequence exceeded 25AB99');
    }
    const admissionNumber = `25AB${String(counter).padStart(2, '0')}`;
    counter += 1;
    return admissionNumber;
  };
}

async function getAdmissionStart() {
  const admissions = await Student.find({
    admissionNumber: /^25AB\d{2}$/,
  }).select('admissionNumber').lean();

  let max = 0;
  for (const row of admissions) {
    const suffix = Number.parseInt(row.admissionNumber.slice(4), 10);
    if (Number.isFinite(suffix) && suffix > max) max = suffix;
  }
  return max + 1;
}

async function run() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find((arg) => !arg.startsWith('--'));
  const excelPath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.resolve(repoRoot, '..', 'Student sheet  2025-26.xlsx');

  console.log(`Using Excel: ${excelPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);

  await connectDB();

  const workbook = xlsx.readFile(excelPath);
  const allRows = workbook.SheetNames.flatMap((sheetName) =>
    parseSheetRows(workbook.Sheets[sheetName], sheetName)
  );

  if (allRows.length === 0) {
    console.log('No rows parsed from workbook. Exiting.');
    await mongoose.connection.close();
    return;
  }

  const startAdmission = await getAdmissionStart();
  const nextAdmission = nextAdmissionFactory(startAdmission);

  const stats = {
    rows: allRows.length,
    parentsCreated: 0,
    parentsFound: 0,
    studentsCreated: 0,
    studentsFound: 0,
    invoicesCreated: 0,
    invoicesFound: 0,
    paymentsCreated: 0,
    skippedNoFeeData: 0,
  };

  for (const row of allRows) {
    const nameInfo = splitStudentName(row.studentName);
    const parentName = deriveParentName(nameInfo.parts);

    const feeBreakdown = buildPaymentBreakdown(row.monetary);
    const paidByBreakdown = feeBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const paidAmount = row.monetary.total > 0 ? row.monetary.total : paidByBreakdown;
    const balance = toAmount(row.monetary.balance);
    const invoiceTotal = Math.max(paidAmount + balance, paidByBreakdown + balance, paidAmount);

    if (invoiceTotal <= 0) {
      stats.skippedNoFeeData += 1;
      continue;
    }

    let parent = await User.findOne({
      role: USER_ROLES.PARENT,
      phone: row.mobile,
    });

    let admissionNumberForParent = null;
    if (!parent) {
      admissionNumberForParent = nextAdmission();
      const email = `${admissionNumberForParent.toLowerCase()}@gmail.com`;
      const password = email;

      if (!dryRun) {
        parent = await User.create({
          firstName: parentName.firstName,
          lastName: parentName.lastName,
          email,
          password,
          role: USER_ROLES.PARENT,
          phone: row.mobile,
        });
      } else {
        parent = {
          _id: new mongoose.Types.ObjectId(),
          firstName: parentName.firstName,
          lastName: parentName.lastName,
        };
      }
      stats.parentsCreated += 1;
    } else {
      stats.parentsFound += 1;
    }

    let existingStudent = await Student.findOne({
      parent: parent._id,
      firstName: nameInfo.firstName,
      lastName: nameInfo.lastName,
      class: row.className,
      academicYear: DEFAULTS.academicYear,
    });

    if (!existingStudent) {
      const admissionNumber = admissionNumberForParent || nextAdmission();
      if (!dryRun) {
        existingStudent = await Student.create({
          firstName: nameInfo.firstName,
          lastName: nameInfo.lastName,
          dateOfBirth: DEFAULTS.dateOfBirth,
          gender: DEFAULTS.gender,
          admissionNumber,
          admissionDate: DEFAULTS.admissionDate,
          class: row.className,
          parent: parent._id,
          academicYear: DEFAULTS.academicYear,
          status: 'active',
        });

        await User.findByIdAndUpdate(parent._id, {
          $addToSet: { children: existingStudent._id },
        });
      } else {
        existingStudent = { _id: new mongoose.Types.ObjectId() };
      }
      stats.studentsCreated += 1;
    } else {
      stats.studentsFound += 1;
    }

    let invoice = await Invoice.findOne({
      student: existingStudent._id,
      academicYear: DEFAULTS.academicYear,
      term: 'Excel Import 2025-26',
    });

    if (!invoice) {
      if (!dryRun) {
        invoice = await Invoice.create({
          student: existingStudent._id,
          parent: parent._id,
          items: [
            {
              description: `Imported fee data (${row.className})`,
              amount: invoiceTotal,
            },
          ],
          subtotal: invoiceTotal,
          tax: 0,
          discount: 0,
          total: invoiceTotal,
          dueDate: DEFAULTS.dueDate,
          academicYear: DEFAULTS.academicYear,
          term: 'Excel Import 2025-26',
        });
      } else {
        invoice = { _id: new mongoose.Types.ObjectId(), total: invoiceTotal, status: 'pending' };
      }
      stats.invoicesCreated += 1;
    } else {
      stats.invoicesFound += 1;
    }

    const existingPayments = await Payment.countDocuments({
      invoice: invoice._id,
      remarks: { $regex: /Excel import/i },
    });

    if (existingPayments === 0 && paidAmount > 0) {
      const shouldUseBreakdown = paidByBreakdown > 0 && Math.abs(paidByBreakdown - paidAmount) <= 1;
      const paymentRows = shouldUseBreakdown
        ? feeBreakdown
        : [{
          amount: paidAmount,
          transactionDate: MONTH_DATES.june,
          remarks: 'Excel import: total',
        }];

      if (!dryRun) {
        for (const entry of paymentRows) {
          await Payment.create({
            invoice: invoice._id,
            student: existingStudent._id,
            parent: parent._id,
            amount: entry.amount,
            paymentMethod: DEFAULTS.paymentMethod,
            transactionDate: entry.transactionDate,
            status: 'completed',
            remarks: `${entry.remarks} | ${row.sheetName}`,
          });
        }

        const completedPayments = await Payment.find({
          invoice: invoice._id,
          status: 'completed',
        }).select('amount').lean();
        const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= invoice.total) {
          invoice.status = 'paid';
        } else if (totalPaid > 0) {
          invoice.status = 'partially_paid';
        } else {
          invoice.status = 'pending';
        }
        await invoice.save();
      }

      stats.paymentsCreated += paymentRows.length;
    }
  }

  console.log('Import complete.');
  console.table(stats);
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error('Import failed:', error.message);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
