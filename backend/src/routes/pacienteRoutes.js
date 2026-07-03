import { Router } from 'express';
import {
  createPerfil, getPerfil, updatePerfil,
  getHistorico, getAgendamentos,
  getDadosSaudeTitular, saveDadosSaudeTitular,
  getConsultaDetalhesPaciente, getReceitaPdfPaciente, getProximaConsulta,
  getExtrato, concluirOnboarding, getRetornoSugerido, getMeusDocumentos,
} from '../controllers/PacienteController.js';
import { getNotificacoes, marcarLidas } from '../controllers/NotificacaoController.js';
import { getParceirosPaciente, registrarClique } from '../controllers/PartnerPharmacyController.js';
import { getConsentStatus, registrarConsentimento } from '../controllers/ConsentController.js';
import { exportarDados, excluirConta } from '../controllers/LgpdController.js';
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

// Consentimento informado — telefarmácia
router.get('/consent/telefarmacia',  authMiddleware, getConsentStatus);
router.post('/consent/telefarmacia', authMiddleware, registrarConsentimento);

// LGPD — direitos do titular
router.get('/lgpd/exportar',         authMiddleware, exportarDados);
router.post('/lgpd/excluir-conta',   authMiddleware, excluirConta);

// Retorno sugerido pelo farmacêutico
router.get('/paciente/retorno-sugerido', authMiddleware, getRetornoSugerido);

// Meus documentos (receitas + orientações de consultas concluídas)
router.get('/paciente/documentos', authMiddleware, getMeusDocumentos);

export default router;
