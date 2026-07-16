import { Router } from 'express';
import { googleLogin, register, login, getMe, completeOnboarding } from '../controllers/AuthController.js';
import { validarConvite, registrarViaConvite } from '../controllers/OnboardingController.js';
import { esqueciSenha, redefinirSenha } from '../controllers/PasswordController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { esqueciSenhaPorEmailLimiter, esqueciSenhaPorIpLimiter } from '../middlewares/passwordResetLimiter.js';

const router = Router();

router.post('/google', googleLogin);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/onboarding', authMiddleware, completeOnboarding);

// Fluxo 2 — Esqueci minha senha (públicas, deslogado)
router.post('/esqueci-senha', esqueciSenhaPorIpLimiter, esqueciSenhaPorEmailLimiter, esqueciSenha);
router.post('/redefinir-senha', redefinirSenha);

// Onboarding via convite (rotas públicas)
router.get('/convite/:token',            validarConvite);
router.post('/convite/:token/registrar', registrarViaConvite);

export default router;
