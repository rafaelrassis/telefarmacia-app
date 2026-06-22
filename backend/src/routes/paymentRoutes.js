import express from 'express';
import { generatePixCharge, handleWebhook } from '../controllers/PaymentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota para o paciente (logado) gerar a cobrança PIX para um agendamento
// É protegida para garantir que apenas o usuário autenticado possa gerar cobranças.
router.post('/payments/charge', authMiddleware, generatePixCharge);

// Rota de Webhook para receber a confirmação de pagamento do gateway.
// Esta rota é pública, pois é chamada pelo serviço externo (gateway de pagamento).
router.post('/payments/webhook', handleWebhook);

export default router;