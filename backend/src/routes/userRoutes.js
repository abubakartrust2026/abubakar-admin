import express from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser, getParents } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.route('/').get(getUsers).post(createUser);
router.get('/parents', getParents);
router.route('/:id').get(getUserById).put(updateUser).delete(deleteUser);

export default router;