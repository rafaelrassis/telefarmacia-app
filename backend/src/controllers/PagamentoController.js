import { PrismaClient } from '@prisma/client';
import { criarPagamentoPix, buscarPagamento } from '../services/mercadoPagoService.js';

const prisma = new PrismaClient();

const PRECO_PADRAO = parseFloat(process.env.PRECO_CONSULTA_PADRAO || '50.00');

export const simularCheckout = async (req, res) => {
  try {
    const { valor_pretendido } = req.body;
    const valor = parseFloat(valor_pretendido);

    if (!valor || valor <= 0) {
      return res.status(400).json({ error: 'Valor inválido.' });
    }

    // Cria o registro pendente primeiro para termos o id como external_reference.
    const pagamento = await prisma.pagamento.create({
      data: {
        pacienteId: req.user.id,
        valor,
        status: 'Pendente',
        qrCodeMock: '',
      },
    });

    let pix;
    try {
      pix = await criarPagamentoPix(valor, req.user.id, pagamento.id, req.user.email);
    } catch (mpErr) {
      console.error('[PagamentoController] Erro ao criar PIX no Mercado Pago:', mpErr.message);
      await prisma.pagamento.delete({ where: { id: pagamento.id } });
      return res.status(502).json({ error: 'Erro ao gerar cobrança PIX. Tente novamente.' });
    }

    await prisma.pagamento.update({
      where: { id: pagamento.id },
      data: { mpPaymentId: pix.id, qrCodeMock: pix.qr_code || '' },
    });

    return res.status(201).json({
      pagamento_id: pagamento.id,
      status: 'Pendente',
      qr_code: pix.qr_code,
      qr_code_base64: pix.qr_code_base64,
      valor: parseFloat(pagamento.valor),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar cobrança.' });
  }
};

// Fallback de polling manual — a confirmação oficial acontece via webhook
// (ver WebhookController.processarPayment). Aqui apenas consultamos o status
// real do pagamento no Mercado Pago; nunca aprovamos localmente sem checar.
export const confirmarPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const pacienteId = req.user.id;

    const pagamento = await prisma.pagamento.findUnique({ where: { id } });
    if (!pagamento) return res.status(404).json({ error: 'Pagamento não encontrado.' });
    if (pagamento.pacienteId !== pacienteId) return res.status(403).json({ error: 'Acesso negado.' });

    if (pagamento.status === 'Pago') {
      const carteira = await prisma.carteira.findUnique({ where: { pacienteId } });
      return res.status(200).json({
        success: true,
        novo_saldo_creditos: carteira ? parseFloat(carteira.saldo) : 0,
        status: 'Pago',
      });
    }

    if (!pagamento.mpPaymentId) {
      return res.status(400).json({ error: 'Pagamento ainda não processado.' });
    }

    let mpPayment;
    try {
      mpPayment = await buscarPagamento(pagamento.mpPaymentId);
    } catch (mpErr) {
      console.error('[PagamentoController] Erro ao consultar pagamento no Mercado Pago:', mpErr.message);
      return res.status(502).json({ error: 'Erro ao consultar status do pagamento.' });
    }

    if (mpPayment.status !== 'approved') {
      return res.status(200).json({ success: false, status: 'Pendente' });
    }

    const carteira = await prisma.$transaction(async (tx) => {
      const atual = await tx.pagamento.findUnique({ where: { id } });
      if (atual.status === 'Pago') return tx.carteira.findUnique({ where: { pacienteId } });

      await tx.pagamento.update({
        where: { id },
        data: { status: 'Pago', confirmedAt: new Date() },
      });

      const c = await tx.carteira.upsert({
        where:  { pacienteId },
        update: { saldo: { increment: pagamento.valor } },
        create: { pacienteId, saldo: pagamento.valor },
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

      return c;
    });

    return res.status(200).json({
      success: true,
      novo_saldo_creditos: parseFloat(carteira.saldo),
      status: 'Pago',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao confirmar pagamento.' });
  }
};

export const getSaldo = async (req, res) => {
  try {
    const carteira = await prisma.carteira.findUnique({
      where: { pacienteId: req.user.id },
    });
    return res.status(200).json({
      saldo_disponivel: carteira ? parseFloat(carteira.saldo) : 0,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar saldo.' });
  }
};

export { PRECO_PADRAO };

// ── POST /api/creditos/adicionar-teste ───────────────────────────────────────

export const adicionarCreditoTeste = async (req, res) => {
  try {
    const { valor = 50 } = req.body;
    const pacienteId = req.user.id;

    const carteira = await prisma.$transaction(async (tx) => {
      const c = await tx.carteira.upsert({
        where:  { pacienteId },
        update: { saldo: { increment: valor } },
        create: { pacienteId, saldo: valor },
      });
      await tx.transacaoCarteira.create({
        data: {
          carteiraId: c.id,
          tipo:       'credito',
          valor,
          saldoApos:  c.saldo,
          descricao:  'Crédito de teste',
        },
      });
      return c;
    });

    return res.status(200).json({ novo_saldo: parseFloat(carteira.saldo) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao adicionar crédito.' });
  }
};
