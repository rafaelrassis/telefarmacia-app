import { Router } from 'express';
import { alterarSenha } from '../controllers/PasswordController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Fluxo 1 & 3 — Alterar senha / Definir senha (usuário logado)
router.post('/conta/alterar-senha', authMiddleware, alterarSenha);

export default router;
