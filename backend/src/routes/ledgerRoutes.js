import express from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
  getInstitutionComparison,
  getMonthlySummary,
  getCategoryBreakdown,
  exportTransactions,
} from '../controllers/ledgerController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardSummary);
router.get('/comparison', getInstitutionComparison);
router.get('/monthly-summary', getMonthlySummary);
router.get('/breakdown', getCategoryBreakdown);
router.get('/export', exportTransactions);

router.route('/transactions')
  .get(getTransactions)
  .post(createTransaction);

router.route('/transactions/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
