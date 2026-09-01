import express from 'express';
import {
  getOpeningBalance,
  upsertOpeningBalance,
  getAllOpeningBalancesForYear,
} from '../controllers/openingBalanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', getOpeningBalance);
router.put('/', upsertOpeningBalance);
router.get('/by-year/:financialYear', getAllOpeningBalancesForYear);

export default router;
