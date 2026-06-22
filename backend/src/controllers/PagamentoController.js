import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRECO_PADRAO = parseFloat(process.env.PRECO_CONSULTA_PADRAO || '50.00');

function gerarQrMock(valor) {
  const v = String(Math.round(valor * 100)).padStart(4, '0');
  return `00020126360014br.gov.bcb.pix0114telefarmacia${v}5204000053039865802BR5913FarmaConsulta6009Sao Paulo62070503***6304ABCD`;
}

export const simularCheckout = async (req, res) => {
  try {
    const { valor_pretendido } = req.body;
    const valor = parseFloat(valor_pretendido);

    if (!valor || valor <= 0) {
      return res.status(400).json({ error: 'Valor inválido.' });
    }

    const pagamento = await prisma.pagamento.create({
      data: {
        pacienteId: req.user.id,
        valor,
        status: 'Pendente',
        qrCodeMock: gerarQrMock(valor),
      },
    });

    return res.status(201).json({
      pagamento_id: pagamento.id,
      status: 'Pendente',
      qr_code_mock: pagamento.qrCodeMock,
      valor: parseFloat(pagamento.valor),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao simular checkout.' });
  }
};

export const confirmarPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const pacienteId = req.user.id;

    const pagamento = await prisma.pagamento.findUnique({ where: { id } });
    if (!pagamento) return res.status(404).json({ error: 'Pagamento não encontrado.' });
    if (pagamento.pacienteId !== pacienteId) return res.status(403).json({ error: 'Acesso negado.' });
    if (pagamento.status !== 'Pendente') {
      return res.status(400).json({ error: 'Pagamento já confirmado ou expirado.' });
    }

    const carteira = await prisma.$transaction(async (tx) => {
      await tx.pagamento.update({
        where: { id },
        data: { status: 'Pago', confirmedAt: new Date() },
      });

      return tx.carteira.upsert({
        where: { pacienteId },
        update: { saldo: { increment: pagamento.valor } },
        create: { pacienteId, saldo: pagamento.valor },
      });
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
