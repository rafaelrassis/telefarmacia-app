import { Router } from 'express';
import {
  agendarConsulta,
  agendarUrgente,
  statusUrgente,
  listarAgendadas,
  listarUrgentes,
  aceitarAgendada,
  aceitarUrgente,
} from '../controllers/FilaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Rotas do paciente
router.post('/fila/agendar',             authMiddleware, agendarConsulta);
router.post('/fila/urgente',             authMiddleware, agendarUrgente);
router.get('/fila/urgente/:id',          authMiddleware, statusUrgente);

// Rotas do farmacêutico (listagem + aceitar)
router.get('/fila/agendadas',            authMiddleware, listarAgendadas);
router.get('/fila/urgentes',             authMiddleware, listarUrgentes);
router.post('/fila/agendadas/:id/aceitar', authMiddleware, aceitarAgendada);
router.post('/fila/urgente/:id/aceitar',   authMiddleware, aceitarUrgente);

export default router;
