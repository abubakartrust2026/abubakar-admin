import express from 'express';
import { getMarks, bulkSaveMarks } from '../controllers/marksController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, authorize('admin', 'teacher'));

router.get('/', getMarks);
router.post('/bulk', bulkSaveMarks);

export default router;
