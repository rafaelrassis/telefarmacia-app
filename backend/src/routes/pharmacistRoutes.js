import { Router } from 'express';
import {
  updateProfile,
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

// Rotas autenticadas
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
