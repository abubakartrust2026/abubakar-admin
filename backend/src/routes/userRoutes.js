import express from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser, getParents, resetParentPassword, resetTeacherPassword, bulkParentCredentials } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.route('/').get(getUsers).post(createUser);
router.get('/parents', getParents);
router.post('/parent-credentials/bulk', bulkParentCredentials);
router.post('/:id/reset-parent-password', resetParentPassword);
router.post('/:id/reset-teacher-password', resetTeacherPassword);
router.route('/:id').get(getUserById).put(updateUser).delete(deleteUser);

export default router;