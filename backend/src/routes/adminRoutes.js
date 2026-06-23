import { Router } from 'express';
import {
  getStats,
  getMetricas,
  listPharmacists,
  listPatients,
  listAllAppointments,
  approvePharmacist,
  revokePharmacist,
  deletePharmacist,
  listarPendentes,
  ativarFarmaceutico,
  getDocumentos,
  setStatus,
  getSistemaStatus,
  toggleSistema,
  getLogs,
} from '../controllers/AdminController.js';
import { getHorarios, saveHorarios, isSistemaAberto, getDisponibilidade } from '../controllers/SistemaHorarioController.js';
import { ping } from '../controllers/FarmaceuticoStatusController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = Router();
const guard = [authMiddleware, adminMiddleware];

// Existentes
router.get('/admin/stats',                          ...guard, getStats);
router.get('/admin/pharmacists',                    ...guard, listPharmacists);
router.get('/admin/patients',                       ...guard, listPatients);
router.get('/admin/appointments',                   ...guard, listAllAppointments);
router.patch('/admin/pharmacists/:userId/approve',  ...guard, approvePharmacist);
router.patch('/admin/pharmacists/:userId/revoke',   ...guard, revokePharmacist);
router.delete('/admin/pharmacists/:userId',         ...guard, deletePharmacist);
router.get('/admin/farmaceuticos/pendentes',        ...guard, listarPendentes);
router.patch('/admin/farmaceuticos/:id/ativar',     ...guard, ativarFarmaceutico);

// Novos v2
router.get('/admin/metricas',                        ...guard, getMetricas);
router.get('/admin/farmaceuticos/:id/documentos',    ...guard, getDocumentos);
router.patch('/admin/farmaceuticos/:id/status',      ...guard, setStatus);

// Sistema de agendamentos (status público + toggle admin)
router.get('/sistema/status',                        getSistemaStatus);
router.patch('/admin/sistema',                       ...guard, toggleSistema);

// Horários do sistema (admin) + disponibilidade (público)
router.get('/admin/horarios',                        ...guard, getHorarios);
router.put('/admin/horarios',                        ...guard, saveHorarios);
router.get('/sistema/aberto',                        isSistemaAberto);
router.get('/disponibilidade',                       getDisponibilidade);

// Ping de presença do farmacêutico
router.post('/farmaceutico/ping',                    authMiddleware, ping);

// Logs de ações
router.get('/admin/logs',                            ...guard, getLogs);

export default router;
