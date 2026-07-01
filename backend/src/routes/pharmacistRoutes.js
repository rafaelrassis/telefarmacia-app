import { Router } from 'express';
import {
  getPharmacists,
  getPharmacistAvailability,
  generateAvailability,
  getOwnSchedule,
  deleteAvailability,
  updateProfile,
  getWeeklySchedule,
  saveWeeklySchedule,
  cadastroFarmaceutico,
  setDisponibilidade,
  getCalendario,
  getConsultasFarmaceutico,
  getGanhosFarmaceutico,
  getUrgentesAceitas,
} from '../controllers/PharmacistController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { uploadDocs } from '../utils/multerConfig.js';

const router = Router();

// Rotas públicas
router.get('/pharmacists', getPharmacists);
router.get('/pharmacists/:id/availability', getPharmacistAvailability);

// Rotas autenticadas (paths fixos antes de /:id)
router.get('/pharmacists/me/schedule', authMiddleware, getOwnSchedule);
router.get('/pharmacists/me/weekly-schedule', authMiddleware, getWeeklySchedule);
router.put('/pharmacists/weekly-schedule', authMiddleware, saveWeeklySchedule);
router.post('/pharmacists/availability', authMiddleware, generateAvailability);
router.delete('/pharmacists/availability/:id', authMiddleware, deleteAvailability);
router.patch('/pharmacists/profile', authMiddleware, updateProfile);

// Upload de documentos para ativação
router.post('/farmaceuticos/cadastro', authMiddleware, uploadDocs, cadastroFarmaceutico);

// Disponibilidade online/offline
router.patch('/farmaceuticos/me/disponibilidade', authMiddleware, setDisponibilidade);

// Calendário do farmacêutico (consultas de fila aceitas)
router.get('/farmaceutico/calendario', authMiddleware, getCalendario);

// Consultas do farmacêutico com filtros e paginação
router.get('/farmaceutico/consultas', authMiddleware, getConsultasFarmaceutico);

// Relatório de ganhos do farmacêutico
router.get('/farmaceutico/ganhos', authMiddleware, getGanhosFarmaceutico);

// Urgentes aceitas pelo farmacêutico logado
router.get('/farmaceutico/urgentes-aceitas', authMiddleware, getUrgentesAceitas);

export default router;
