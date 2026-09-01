import express from 'express';
import {
  getInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  deleteInstitution,
} from '../controllers/institutionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getInstitutions)
  .post(createInstitution);

router.route('/:id')
  .get(getInstitutionById)
  .put(updateInstitution)
  .delete(deleteInstitution);

export default router;
