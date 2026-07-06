import express from 'express';
import {
  getStudents, getStudentById, createStudent, updateStudent,
  deleteStudent, getStudentsByParent, getStudentsByClass, promoteStudents,
  previewRollbackPromote, rollbackPromote,
} from '../controllers/studentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('admin'), getStudents)
  .post(authorize('admin'), createStudent);

router.get('/parent/:parentId', getStudentsByParent);
router.get('/class/:class', authorize('admin'), getStudentsByClass);
router.post('/promote', authorize('admin'), promoteStudents);
router.get('/rollback-promote/preview', authorize('admin'), previewRollbackPromote);
router.post('/rollback-promote', authorize('admin'), rollbackPromote);

router.route('/:id')
  .get(getStudentById)
  .put(authorize('admin'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

export default router;