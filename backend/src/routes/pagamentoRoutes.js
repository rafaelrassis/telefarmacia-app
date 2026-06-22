import { Router } from 'express';
import { simularCheckout, confirmarPagamento, getSaldo } from '../controllers/PagamentoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/pagamentos/simular-checkout',   authMiddleware, simularCheckout);
router.post('/pagamentos/:id/confirmar',       authMiddleware, confirmarPagamento);
router.get('/carteira/saldo',                  authMiddleware, getSaldo);

export default router;
