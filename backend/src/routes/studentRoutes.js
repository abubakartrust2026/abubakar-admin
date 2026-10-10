import express from 'express';
import {
  getStudents, getStudentById, createStudent, updateStudent,
  deleteStudent, getStudentsByParent, getStudentsByClass, promoteStudents,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireClassAccess } from '../middleware/teacherScope.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin'), getStudents)
  .post(authorize('admin'), createStudent);

router.get('/parent/:parentId', authorize('admin', 'parent'), getStudentsByParent);
router.get('/class/:class', authorize('admin', 'teacher'), requireClassAccess, getStudentsByClass);
router.post('/promote', authorize('admin'), promoteStudents);

router.route('/:id')
  .get(getStudentById)
  .put(authorize('admin'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

export default router;