import express from 'express';
import { getFees, getFeeById, createFee, updateFee, deleteFee } from '../controllers/feeController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'parent'), getFees)
  .post(authorize('admin'), createFee);

router.route('/:id')
  .get(authorize('admin', 'parent'), getFeeById)
  .put(authorize('admin'), updateFee)
  .delete(authorize('admin'), deleteFee);

export default router;