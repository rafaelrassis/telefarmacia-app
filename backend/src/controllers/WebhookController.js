import { PrismaClient } from '@prisma/client';
import {
  buscarPagamento,
  buscarAssinatura,
  validarAssinaturaWebhook,
} from '../services/mercadoPagoService.js';

const prisma = new PrismaClient();

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// ── POST /api/webhooks/mercadopago ───────────────────────────────────────────
// Sem authMiddleware (quem chama é o Mercado Pago) — a assinatura x-signature
// é a única forma de garantir autenticidade. Rejeita qualquer notificação sem
// assinatura válida antes de processar qualquer evento.
export const receberWebhook = async (req, res) => {
  let assinaturaValida;
  try {
    assinaturaValida = validarAssinaturaWebhook(req);
  } catch (err) {
    console.error('[webhook] erro ao validar assinatura:', err.message);
    return res.status(500).json({ error: 'Erro ao validar webhook.' });
  }
  if (!assinaturaValida) {
    return res.status(401).json({ error: 'Assinatura inválida.' });
  }

  const type   = req.body?.type || req.query.type;
  const dataId = req.body?.data?.id || req.query['data.id'];

  // Sempre 200 depois da assinatura validada — mesmo em erro de processamento,
  // para o MP não ficar reenviando indefinidamente eventos que não vamos
  // conseguir tratar (ex.: tipo de evento não suportado). Erros reais ficam
  // no log para investigação manual.
  try {
    if (type === 'payment') {
      await processarPayment(dataId);
    } else if (type === 'preapproval' || type === 'subscription_preapproval') {
      await processarPreapproval(dataId);
    }
  } catch (err) {
    console.error(`[webhook] erro ao processar evento ${type}/${dataId}:`, err.message);
  }

  return res.status(200).json({ received: true });
};

// ── payment: PIX avulso (recarga de carteira) ────────────────────────────────

async function processarPayment(mpPaymentId) {
  if (!mpPaymentId) return;

  const payment = await buscarPagamento(mpPaymentId);
  if (payment.status !== 'approved') return;

  const pagamento = await prisma.pagamento.findFirst({
    where: {
      OR: [
        { mpPaymentId: String(mpPaymentId) },
        { id: payment.external_reference || undefined },
      ],
    },
  });
  if (!pagamento) return; // não é um PIX avulso nosso (provavelmente cobrança de assinatura)

  // Idempotência: só credita se ainda estiver Pendente.
  if (pagamento.status !== 'Pendente') return;

  await prisma.$transaction(async (tx) => {
    await tx.pagamento.update({
      where: { id: pagamento.id },
      data:  { status: 'Pago', confirmedAt: new Date(), mpPaymentId: String(mpPaymentId) },
    });

    const c = await tx.carteira.upsert({
      where:  { pacienteId: pagamento.pacienteId },
      update: { saldo: { increment: pagamento.valor } },
      create: { pacienteId: pagamento.pacienteId, saldo: pagamento.valor },
    });

    await tx.transacaoCarteira.create({
      data: {
        carteiraId: c.id,
        tipo:       'credito',
        valor:      pagamento.valor,
        saldoApos:  c.saldo,
        descricao:  'Recarga via PIX (Mercado Pago)',
      },
    });
  });
}

// ── preapproval: assinatura mensal ───────────────────────────────────────────

async function processarPreapproval(mpPreapprovalId) {
  if (!mpPreapprovalId) return;

  const assinatura = await prisma.assinatura.findUnique({
    where: { mpPreapprovalId: String(mpPreapprovalId) },
  });
  if (!assinatura) return;

  const preapproval = await buscarAssinatura(mpPreapprovalId);

  if (preapproval.status === 'authorized') {
    const novoCicloFim = preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date)
      : addMonths(new Date(), 1);

    // Idempotência: se o ciclo já reflete essa data, é reentrega do mesmo
    // evento — não reseta consultasUsadasNoMes de novo.
    const mesmoCiclo = assinatura.cicloAtualFim &&
      new Date(assinatura.cicloAtualFim).getTime() === novoCicloFim.getTime();
    if (mesmoCiclo && assinatura.status === 'ativa') return;

    const trialAindaAtivo = assinatura.emTrial && assinatura.trialFim && new Date(assinatura.trialFim) > new Date();

    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data: {
        status:               trialAindaAtivo ? 'trial' : 'ativa',
        consultasUsadasNoMes: 0,
        cicloAtualInicio:     new Date(),
        cicloAtualFim:        novoCicloFim,
      },
    });
  } else if (preapproval.status === 'cancelled') {
    if (assinatura.status === 'cancelada') return; // idempotente
    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data:  { status: 'cancelada', canceladaEm: new Date() },
    });
  }
}
