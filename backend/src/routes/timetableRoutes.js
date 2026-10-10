import express from 'express';
import { getTimetable, getMyTimetable, saveTimetableDay } from '../controllers/timetableController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin', 'teacher'), getTimetable);
router.get('/mine', authorize('teacher'), getMyTimetable);
router.put('/', authorize('admin'), saveTimetableDay);

export default router;
