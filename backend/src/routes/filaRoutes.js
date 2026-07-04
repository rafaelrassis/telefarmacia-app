import { Router } from 'express';
import {
  agendarConsulta,
  agendarUrgente,
  statusUrgente,
  listarAgendadas,
  listarUrgentes,
  aceitarAgendada,
  aceitarUrgente,
  minhaUrgenteAtiva,
  cancelarUrgente,
  cancelarAgendada,
  verificarDisponibilidade,
} from '../controllers/FilaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Rotas do paciente
router.post('/fila/agendar',                  authMiddleware, agendarConsulta);
router.post('/fila/urgente',                  authMiddleware, agendarUrgente);
router.get('/fila/urgente/disponibilidade',   verificarDisponibilidade);          // pública, antes de /:id
router.get('/fila/urgente/ativa',             authMiddleware, minhaUrgenteAtiva); // antes de /:id
router.get('/fila/urgente/:id',               authMiddleware, statusUrgente);
router.post('/fila/urgente/:id/cancelar',  authMiddleware, cancelarUrgente);
router.post('/fila/agendadas/:id/cancelar', authMiddleware, cancelarAgendada);

// Rotas do farmacêutico (listagem + aceitar)
router.get('/fila/agendadas',              authMiddleware, listarAgendadas);
router.get('/fila/urgentes',               authMiddleware, listarUrgentes);
router.post('/fila/agendadas/:id/aceitar', authMiddleware, aceitarAgendada);
router.post('/fila/urgente/:id/aceitar',   authMiddleware, aceitarUrgente);

export default router;
