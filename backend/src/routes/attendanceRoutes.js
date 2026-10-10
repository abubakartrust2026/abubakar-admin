import express from 'express';
import {
  getAttendance, markAttendance, bulkMarkAttendance,
  getAttendanceByStudent, getAttendanceSummary, deleteAttendance,
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Teachers may read/mark attendance only for their assigned classes (enforced in the controller)
router.route('/')
  .get(authorize('admin', 'teacher'), getAttendance)
  .post(authorize('admin', 'teacher'), markAttendance);

router.post('/bulk', authorize('admin', 'teacher'), bulkMarkAttendance);
router.get('/student/:studentId', getAttendanceByStudent);
router.get('/summary/:studentId', getAttendanceSummary);
router.delete('/:id', authorize('admin'), deleteAttendance);

export default router;