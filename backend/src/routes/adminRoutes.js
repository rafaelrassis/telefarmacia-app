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
  getConfigFinanceiro,
  setPreco,
  setComissaoPadrao,
  setConfig,
  setComissaoFarmaceutico,
  deleteComissaoFarmaceutico,
  getVisaoFinanceira,
} from '../controllers/AdminController.js';
import {
  listParceiros, createParceiro, updateParceiro, deleteParceiro,
  getMetricasParceiros, getOndeComprarConfig, toggleOndeComprar,
} from '../controllers/PartnerPharmacyController.js';
import { previewRepasse, registrarRepasse, listarRepasses } from '../controllers/RepasseController.js';
import { listarConvites, criarConvite, revogarConvite } from '../controllers/ConviteController.js';
import { suspenderFarmaceutico, reativarFarmaceutico } from '../controllers/AdminController.js';
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

// Gestão financeira
router.get('/admin/config/financeiro',               ...guard, getConfigFinanceiro);
router.put('/admin/config',                          ...guard, setConfig);
router.put('/admin/config/preco',                    ...guard, setPreco);
router.put('/admin/config/comissao-padrao',          ...guard, setComissaoPadrao);
router.put('/admin/farmaceuticos/:id/comissao',      ...guard, setComissaoFarmaceutico);
router.put('/admin/comissoes/:id',                   ...guard, setComissaoFarmaceutico);
router.delete('/admin/comissoes/:id',                ...guard, deleteComissaoFarmaceutico);
router.get('/admin/financeiro',                      ...guard, getVisaoFinanceira);

// Repasses financeiros
router.get('/admin/repasses/preview',                ...guard, previewRepasse);
router.get('/admin/repasses',                        ...guard, listarRepasses);
router.post('/admin/repasses',                       ...guard, registrarRepasse);

// Convites de farmacêuticos
router.get('/admin/convites',                        ...guard, listarConvites);
router.post('/admin/convites',                       ...guard, criarConvite);
router.delete('/admin/convites/:id',                 ...guard, revogarConvite);

// Suspender / reativar farmacêutico
router.post('/admin/farmaceuticos/:id/suspender',    ...guard, suspenderFarmaceutico);
router.post('/admin/farmaceuticos/:id/reativar',     ...guard, reativarFarmaceutico);

// Gestão de parceiros (Onde Comprar)
router.get('/admin/parceiros',                       ...guard, listParceiros);
router.post('/admin/parceiros',                      ...guard, createParceiro);
router.put('/admin/parceiros/:id',                   ...guard, updateParceiro);
router.delete('/admin/parceiros/:id',                ...guard, deleteParceiro);
router.get('/admin/parceiros/metricas',              ...guard, getMetricasParceiros);
router.get('/admin/config/onde-comprar',             ...guard, getOndeComprarConfig);
router.patch('/admin/config/onde-comprar',           ...guard, toggleOndeComprar);

export default router;
