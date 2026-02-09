import express from 'express';
import { getAdminDashboard, getParentDashboard } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/parent', authorize('parent'), getParentDashboard);

export default router;