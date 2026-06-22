import { Router } from 'express';
import { googleLogin, register, login, getMe, completeOnboarding } from '../controllers/AuthController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/google', googleLogin);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/onboarding', authMiddleware, completeOnboarding);

export default router;
