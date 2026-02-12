import express from 'express';
import {
  getFeeCollectionReport,
  getOutstandingDuesReport,
  getPaymentHistoryReport,
  getClassWiseFeeSummary,
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/fee-collection', getFeeCollectionReport);
router.get('/outstanding-dues', getOutstandingDuesReport);
router.get('/payment-history', getPaymentHistoryReport);
router.get('/class-wise-summary', getClassWiseFeeSummary);

export default router;
