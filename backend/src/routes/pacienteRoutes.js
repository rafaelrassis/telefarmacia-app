import { Router } from 'express';
import { createPerfil, getPerfil, updatePerfil, getHistorico } from '../controllers/PacienteController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/pacientes/perfil',      authMiddleware, createPerfil);
router.get('/pacientes/perfil',       authMiddleware, getPerfil);
router.put('/pacientes/perfil',       authMiddleware, updatePerfil);
router.get('/paciente/historico',     authMiddleware, getHistorico);

export default router;
