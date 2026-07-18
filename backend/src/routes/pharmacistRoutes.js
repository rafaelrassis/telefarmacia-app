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
  exportGanhosFarmaceutico,
  getUrgentesAceitas,
  getMetricasFarmaceutico,
} from '../controllers/PharmacistController.js';
import { listarBloqueios, criarBloqueio, excluirBloqueio } from '../controllers/BloqueioController.js';
import { getMeusRepasses } from '../controllers/RepasseController.js';
import { listarTemplates, criarTemplate, atualizarTemplate, excluirTemplate } from '../controllers/TemplateController.js';
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
router.get('/farmaceutico/ganhos/export', authMiddleware, exportGanhosFarmaceutico);

// Métricas consolidadas do farmacêutico logado
router.get('/farmaceutico/me/metricas', authMiddleware, getMetricasFarmaceutico);

// Urgentes aceitas pelo farmacêutico logado
router.get('/farmaceutico/urgentes-aceitas', authMiddleware, getUrgentesAceitas);

// Repasses recebidos pelo farmacêutico logado
router.get('/farmaceutico/me/repasses', authMiddleware, getMeusRepasses);

// Bloqueios de agenda
router.get('/farmaceutico/bloqueios',        authMiddleware, listarBloqueios);
router.post('/farmaceutico/bloqueios',       authMiddleware, criarBloqueio);
router.delete('/farmaceutico/bloqueios/:id', authMiddleware, excluirBloqueio);

// Templates de orientação/receita
router.get('/farmaceutico/templates',          authMiddleware, listarTemplates);
router.post('/farmaceutico/templates',         authMiddleware, criarTemplate);
router.put('/farmaceutico/templates/:id',      authMiddleware, atualizarTemplate);
router.delete('/farmaceutico/templates/:id',   authMiddleware, excluirTemplate);

export default router;
