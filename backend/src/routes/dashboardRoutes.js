import express from 'express';
import { getAdminDashboard, getParentDashboard, getTeacherDashboard } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/parent', authorize('parent'), getParentDashboard);
router.get('/teacher', authorize('teacher'), getTeacherDashboard);

export default router;