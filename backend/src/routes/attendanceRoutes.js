import express from 'express';
import {
  getAttendance, markAttendance, bulkMarkAttendance,
  getAttendanceByStudent, getAttendanceSummary, deleteAttendance,
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin'), getAttendance)
  .post(authorize('admin'), markAttendance);

router.post('/bulk', authorize('admin'), bulkMarkAttendance);
router.get('/student/:studentId', getAttendanceByStudent);
router.get('/summary/:studentId', getAttendanceSummary);
router.delete('/:id', authorize('admin'), deleteAttendance);

export default router;