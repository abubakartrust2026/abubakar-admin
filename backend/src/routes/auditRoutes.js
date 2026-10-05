import express from 'express';
import { getAuditLogs, getTrash, restoreRecord } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', getAuditLogs);
router.get('/trash/:entity', getTrash);
router.post('/trash/:entity/:id/restore', restoreRecord);

export default router;
