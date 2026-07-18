import { Router } from 'express';
import {
  listarLembretes, criarLembrete, atualizarLembrete, excluirLembrete,
} from '../controllers/LembreteController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Lembretes de medicação — autosserviço do paciente
router.get('/paciente/lembretes',        authMiddleware, listarLembretes);
router.post('/paciente/lembretes',       authMiddleware, criarLembrete);
router.patch('/paciente/lembretes/:id',  authMiddleware, atualizarLembrete);
router.delete('/paciente/lembretes/:id', authMiddleware, excluirLembrete);

export default router;
