import { Router } from 'express';
import { googleLogin, register, login, getMe, completeOnboarding } from '../controllers/AuthController.js';
import { validarConvite, registrarViaConvite } from '../controllers/OnboardingController.js';
import { esqueciSenha, redefinirSenha } from '../controllers/PasswordController.js';
import { confirmarEmail, reenviarConfirmacao } from '../controllers/EmailConfirmationController.js';
import { setupTotp, enableTotp, disableTotp, verifyTotp } from '../controllers/TotpController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { esqueciSenhaPorEmailLimiter, esqueciSenhaPorIpLimiter } from '../middlewares/passwordResetLimiter.js';
import { reenviarConfirmacaoPorMinutoLimiter, reenviarConfirmacaoPorHoraLimiter } from '../middlewares/emailConfirmationLimiter.js';
import { totpVerifyPorTokenLimiter, totpVerifyPorIpLimiter } from '../middlewares/totpLimiter.js';

const router = Router();

router.post('/google', googleLogin);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/onboarding', authMiddleware, completeOnboarding);

// Autenticação em duas etapas (TOTP) — configuração via Perfil (autenticada)
router.post('/totp/setup', authMiddleware, setupTotp);
router.post('/totp/enable', authMiddleware, enableTotp);
router.post('/totp/disable', authMiddleware, disableTotp);

// Segunda etapa do login quando totpEnabled=true (pública, usa tempToken)
router.post('/totp/verify', totpVerifyPorIpLimiter, totpVerifyPorTokenLimiter, verifyTotp);

// Fluxo 2 — Esqueci minha senha (públicas, deslogado)
router.post('/esqueci-senha', esqueciSenhaPorIpLimiter, esqueciSenhaPorEmailLimiter, esqueciSenha);
router.post('/redefinir-senha', redefinirSenha);

// Confirmação de e-mail no cadastro (públicas, deslogado)
router.post('/confirmar-email', confirmarEmail);
router.post('/reenviar-confirmacao', reenviarConfirmacaoPorMinutoLimiter, reenviarConfirmacaoPorHoraLimiter, reenviarConfirmacao);

// Onboarding via convite (rotas públicas)
router.get('/convite/:token',            validarConvite);
router.post('/convite/:token/registrar', registrarViaConvite);

export default router;
