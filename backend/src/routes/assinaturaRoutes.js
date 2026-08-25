import { Router } from 'express';
import {
  iniciarAssinatura,
  minhaAssinatura,
  cancelarAssinaturaHandler,
} from '../controllers/AssinaturaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/assinaturas/iniciar',  authMiddleware, iniciarAssinatura);
router.get('/assinaturas/minha',     authMiddleware, minhaAssinatura);
router.post('/assinaturas/cancelar', authMiddleware, cancelarAssinaturaHandler);

export default router;
