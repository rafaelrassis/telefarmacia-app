import { Router } from 'express';
import {
  getConsulta,
  getDetalhesConsulta,
  iniciarConsulta,
  concluirConsulta,
  cancelarConsulta,
  devolverConsulta,
  salvarRascunho,
  gerarReceitaPdf,
  gerarEncaminhamentoPdf,
  getHistoricoPaciente,
  getHistoricoCompleto,
  semContato,
  remarcarConsulta,
  proporRemarcacao,
  responderRemarcacao,
  dispensarRetorno,
} from '../controllers/ConsultaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/consulta/:id',             authMiddleware, getConsulta);
router.patch('/consulta/:id/iniciar',   authMiddleware, iniciarConsulta);
router.patch('/consulta/:id/concluir',  authMiddleware, concluirConsulta);
router.patch('/consulta/:id/cancelar',        authMiddleware, cancelarConsulta);
router.patch('/consulta/:id/devolver',        authMiddleware, devolverConsulta);
router.patch('/consulta/:id/salvar-rascunho', authMiddleware, salvarRascunho);
router.post('/consulta/:id/receita/pdf',          authMiddleware, gerarReceitaPdf);
router.post('/consulta/:id/encaminhamento/pdf',   authMiddleware, gerarEncaminhamentoPdf);
router.get('/consulta/:id/detalhes',              authMiddleware, getDetalhesConsulta);
router.get('/consulta/:id/historico-completo',    authMiddleware, getHistoricoCompleto);
// 3 segmentos — não conflita com /paciente/historico (2 segmentos)
router.get('/paciente/:id/historico',             authMiddleware, getHistoricoPaciente);

// WhatsApp / sem-contato
router.patch('/consulta/:id/sem-contato',         authMiddleware, semContato);

// Remarcação — paciente
router.patch('/consulta/:id/remarcar',            authMiddleware, remarcarConsulta);
router.patch('/consulta/:id/responder-remarcacao', authMiddleware, responderRemarcacao);

// Remarcação — farmacêutico
router.patch('/consulta/:id/propor-remarcacao',   authMiddleware, proporRemarcacao);

// Retorno sugerido — dispensar (paciente)
router.patch('/consulta/:id/dispensar-retorno',   authMiddleware, dispensarRetorno);

export default router;
