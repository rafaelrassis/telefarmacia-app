import { MercadoPagoConfig, Payment, PreApproval, WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago';
import crypto from 'crypto';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: { timeout: 8000 },
});

const paymentClient     = new Payment(client);
const preApprovalClient = new PreApproval(client);

const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3000';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',')[0].trim();

// ── PIX avulso (recarga de crédito) ──────────────────────────────────────────

export async function criarPagamentoPix(valor, pacienteId, pagamentoId, payerEmail) {
  const payment = await paymentClient.create({
    body: {
      transaction_amount: Number(valor),
      description: 'Recarga de créditos — FarmaConsulta',
      payment_method_id: 'pix',
      external_reference: pagamentoId,
      notification_url: `${BACKEND_URL}/api/webhooks/mercadopago`,
      payer: {
        email: payerEmail || `paciente-${pacienteId}@telefarmacia.invalid`,
      },
    },
    requestOptions: { idempotencyKey: crypto.randomUUID() },
  });

  const txData = payment.point_of_interaction?.transaction_data || {};
  return {
    id: String(payment.id),
    status: payment.status,
    qr_code: txData.qr_code || null,
    qr_code_base64: txData.qr_code_base64 || null,
  };
}

export async function buscarPagamento(mpPaymentId) {
  return paymentClient.get({ id: mpPaymentId });
}

// ── Assinatura mensal (Preapproval) ──────────────────────────────────────────

// plano: { nome, preco }. trial: opcional { tipo: 'dias_gratis', dias } — MP só
// suporta desconto temporal por dias-grátis nativamente (ver Etapa 8); para
// desconto_percentual o valor cheio é cobrado no MP e a diferença é
// creditada manualmente na Carteira do paciente durante o período do trial.
export async function criarAssinatura(pacienteId, payerEmail, plano, trial) {
  const autoRecurring = {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: Number(plano.preco),
    currency_id: 'BRL',
  };

  if (trial?.tipo === 'dias_gratis' && trial.dias > 0) {
    autoRecurring.free_trial = { frequency: trial.dias, frequency_type: 'days' };
  }

  const preapproval = await preApprovalClient.create({
    body: {
      reason: plano.nome || 'Plano Mensal',
      external_reference: pacienteId,
      payer_email: payerEmail,
      back_url: `${FRONTEND_URL}/assinatura/retorno`,
      auto_recurring: autoRecurring,
      status: 'pending',
    },
    requestOptions: { idempotencyKey: crypto.randomUUID() },
  });

  return {
    id: preapproval.id,
    status: preapproval.status,
    init_point: preapproval.init_point,
  };
}

export async function buscarAssinatura(mpPreapprovalId) {
  return preApprovalClient.get({ id: mpPreapprovalId });
}

export async function cancelarAssinatura(mpPreapprovalId) {
  return preApprovalClient.update({
    id: mpPreapprovalId,
    body: { status: 'cancelled' },
  });
}

// ── Validação de webhook (x-signature + x-request-id) ────────────────────────
// Rejeita qualquer requisição sem assinatura válida — nunca processar um
// webhook sem essa checagem passar.

export function validarAssinaturaWebhook(req) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET não configurado.');
  }
  const dataId = req.query['data.id'] ?? req.body?.data?.id;
  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      dataId,
      secret,
      toleranceSeconds: 300,
    });
    return true;
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return false;
    throw err;
  }
}

export { client as mercadoPagoClient };
