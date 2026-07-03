import { Router } from 'express';
import {
  createPerfil, getPerfil, updatePerfil,
  getHistorico, getAgendamentos,
  getDadosSaudeTitular, saveDadosSaudeTitular,
  getConsultaDetalhesPaciente, getReceitaPdfPaciente, getProximaConsulta,
  getExtrato, concluirOnboarding,
} from '../controllers/PacienteController.js';
import { getNotificacoes, marcarLidas } from '../controllers/NotificacaoController.js';
import { getParceirosPaciente, registrarClique } from '../controllers/PartnerPharmacyController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/pacientes/perfil',          authMiddleware, createPerfil);
router.get('/pacientes/perfil',           authMiddleware, getPerfil);
router.put('/pacientes/perfil',           authMiddleware, updatePerfil);
router.get('/paciente/historico',         authMiddleware, getHistorico);
router.get('/paciente/agendamentos',      authMiddleware, getAgendamentos);
router.get('/pacientes/dados-saude',      authMiddleware, getDadosSaudeTitular);
router.patch('/pacientes/dados-saude',    authMiddleware, saveDadosSaudeTitular);
router.get('/paciente/proxima-consulta',  authMiddleware, getProximaConsulta);
router.get('/paciente/extrato',                      authMiddleware, getExtrato);
router.patch('/paciente/onboarding/concluir',        authMiddleware, concluirOnboarding);
router.get('/paciente/notificacoes',                 authMiddleware, getNotificacoes);
router.patch('/paciente/notificacoes/marcar-lidas',  authMiddleware, marcarLidas);
router.get('/paciente/consulta/:id/pdf',  authMiddleware, getReceitaPdfPaciente);
router.get('/paciente/consulta/:id',      authMiddleware, getConsultaDetalhesPaciente);

// Onde Comprar — parceiros ativos (flag-gated) e registro de clique
router.get('/parceiros',             authMiddleware, getParceirosPaciente);
router.post('/parceiros/:id/click',  authMiddleware, registrarClique);

export default router;
