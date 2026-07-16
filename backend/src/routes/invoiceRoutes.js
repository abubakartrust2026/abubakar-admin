import express from 'express';
import { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice, syncCounter } from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(authorize('admin'), createInvoice);

router.post('/sync-counter', authorize('admin'), syncCounter);

router.route('/:id')
  .get(getInvoiceById)
  .put(authorize('admin'), updateInvoice)
  .delete(authorize('admin'), deleteInvoice);

export default router;