import express from 'express';
import { getPayments, getPaymentById, createPayment, updatePayment } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(authorize('admin'), createPayment);

router.route('/:id')
  .get(getPaymentById)
  .put(authorize('admin'), updatePayment);

export default router;