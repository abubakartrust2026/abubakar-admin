import express from 'express';
import { getHomework, createHomework, updateHomework, deleteHomework } from '../controllers/homeworkController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Parents can read homework for their children's classes; only staff can change it
router.get('/', authorize('admin', 'teacher', 'parent'), getHomework);
router.post('/', authorize('admin', 'teacher'), createHomework);
router.route('/:id')
  .put(authorize('admin', 'teacher'), updateHomework)
  .delete(authorize('admin', 'teacher'), deleteHomework);

export default router;
