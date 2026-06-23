import { Router } from 'express';
import { simularCheckout, confirmarPagamento, getSaldo, adicionarCreditoTeste } from '../controllers/PagamentoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/pagamentos/simular-checkout',   authMiddleware, simularCheckout);
router.post('/pagamentos/:id/confirmar',       authMiddleware, confirmarPagamento);
router.get('/carteira/saldo',                  authMiddleware, getSaldo);
router.post('/creditos/adicionar-teste',       authMiddleware, adicionarCreditoTeste);

export default router;
