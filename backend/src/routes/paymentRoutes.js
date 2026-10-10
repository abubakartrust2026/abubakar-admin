import express from 'express';
import { getPayments, getPaymentById, createPayment, bulkCreatePayments, updatePayment, deletePayment } from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin', 'parent'), getPayments)
  .post(authorize('admin'), createPayment);

router.post('/bulk', authorize('admin'), bulkCreatePayments);

router.route('/:id')
  .get(authorize('admin', 'parent'), getPaymentById)
  .put(authorize('admin'), updatePayment)
  .delete(authorize('admin'), deletePayment);

export default router;