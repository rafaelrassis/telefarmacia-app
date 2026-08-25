import { Router } from 'express';
import { receberWebhook } from '../controllers/WebhookController.js';

const router = Router();

// Chamado pelo Mercado Pago — sem authMiddleware (não é um usuário logado).
// Autenticidade garantida pela validação de assinatura (x-signature) dentro
// do controller, obrigatória antes de processar qualquer evento.
router.post('/webhooks/mercadopago', receberWebhook);

export default router;
