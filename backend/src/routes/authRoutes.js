import express from 'express';
import { login, parentLogin, changePassword, refreshToken, getMe, logout } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/parent-login', parentLogin);
router.post('/change-password', protect, changePassword);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;