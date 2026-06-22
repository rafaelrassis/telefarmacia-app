import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  confirmAppointment,
  getAppointmentById,
  completeAppointment,
  cancelAppointment,
  getDisponiveis,
  reservarSlot,
  agendarProximo,
  proximoDisponivel,
  atualizarStatus,
} from '../controllers/AppointmentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Rotas existentes (mantidas para compatibilidade com o frontend atual)
router.post('/appointments',             authMiddleware, createAppointment);
router.get('/appointments',              authMiddleware, getAppointments);
router.get('/appointments/:id',          authMiddleware, getAppointmentById);
router.post('/appointments/:id/confirm', authMiddleware, confirmAppointment);
router.patch('/appointments/:id/complete', authMiddleware, completeAppointment);
router.patch('/appointments/:id/cancel',   authMiddleware, cancelAppointment);

// Novas rotas v2
router.get('/agendamentos/disponiveis',          authMiddleware, getDisponiveis);
router.post('/agendamentos/reservar',            authMiddleware, reservarSlot);
router.post('/agendamentos/agendar-proximo',     authMiddleware, agendarProximo);
router.post('/agendamentos/proximo-disponivel',  authMiddleware, proximoDisponivel);
router.post('/agendamentos/:id/status',          authMiddleware, atualizarStatus);

export default router;
