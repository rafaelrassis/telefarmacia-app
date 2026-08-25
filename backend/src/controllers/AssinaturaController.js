import { PrismaClient } from '@prisma/client';
import { criarAssinatura, cancelarAssinatura as cancelarAssinaturaMP } from '../services/mercadoPagoService.js';

const prisma = new PrismaClient();

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// Assinatura com vaga disponível no ciclo atual (usada no ponto de débito de
// consulta) — null se o paciente não tem assinatura ativa/trial ou já usou
// todas as consultas incluídas no mês.
export async function getAssinaturaComVaga(pacienteId) {
  const assinatura = await prisma.assinatura.findFirst({
    where: { pacienteId, status: { in: ['ativa', 'trial'] } },
    include: { plano: true },
  });
  if (!assinatura) return null;
  if (assinatura.consultasUsadasNoMes >= assinatura.plano.consultasIncluidas) return null;
  return assinatura;
}

// ── POST /api/assinaturas/iniciar ────────────────────────────────────────────

export const iniciarAssinatura = async (req, res) => {
  const pacienteId = req.user.id;
  try {
    const plano = await prisma.plano.findFirst({ where: { ativo: true }, orderBy: { criadoEm: 'desc' } });
    if (!plano) return res.status(400).json({ error: 'Nenhum plano de assinatura configurado no momento.' });

    const existente = await prisma.assinatura.findFirst({
      where: { pacienteId, status: { in: ['ativa', 'trial', 'pendente'] } },
    });
    if (existente) return res.status(400).json({ error: 'Você já possui uma assinatura em andamento.' });

    const jaTeveAssinatura = (await prisma.assinatura.count({ where: { pacienteId } })) > 0;
    const promo = await prisma.promoTrial.findFirst();
    const elegivelTrial = !jaTeveAssinatura && !!promo?.ativo;

    let trialConfig = null;
    let descontoTrialPercentual = null;
    let trialFim = null;
    let emTrial = false;

    if (elegivelTrial && promo.tipo === 'dias_gratis' && promo.dias > 0) {
      trialConfig = { tipo: 'dias_gratis', dias: promo.dias };
      trialFim = new Date(Date.now() + promo.dias * 24 * 60 * 60 * 1000);
      emTrial = true;
    } else if (elegivelTrial && promo.tipo === 'desconto_percentual' && promo.percentual) {
      // A Preapproval API do Mercado Pago não suporta desconto temporal
      // nativo (o valor recorrente é fixo desde a criação) — cobramos o
      // valor cheio no MP e compensamos o desconto do período de trial como
      // um bônus creditado direto na carteira do paciente (ver abaixo).
      descontoTrialPercentual = promo.percentual;
      trialFim = new Date(Date.now() + promo.dias * 24 * 60 * 60 * 1000);
      emTrial = true;
    }

    let mp;
    try {
      mp = await criarAssinatura(pacienteId, req.user.email, plano, trialConfig);
    } catch (err) {
      console.error('[AssinaturaController] Erro ao criar preapproval no Mercado Pago:', err.message);
      return res.status(502).json({ error: 'Erro ao iniciar assinatura no Mercado Pago.' });
    }

    const assinatura = await prisma.$transaction(async (tx) => {
      const nova = await tx.assinatura.create({
        data: {
          pacienteId,
          planoId: plano.id,
          status: 'pendente', // vira 'ativa'/'trial' quando o webhook confirmar a autorização no MP
          mpPreapprovalId: mp.id,
          cicloAtualFim: trialFim ?? addMonths(new Date(), 1),
          emTrial,
          trialFim,
          descontoTrialPercentual,
        },
      });

      if (descontoTrialPercentual && promo.dias > 0) {
        const bonus = Math.round(Number(plano.preco) * Number(descontoTrialPercentual) / 100 * 100) / 100;
        if (bonus > 0) {
          const c = await tx.carteira.upsert({
            where:  { pacienteId },
            update: { saldo: { increment: bonus } },
            create: { pacienteId, saldo: bonus },
          });
          await tx.transacaoCarteira.create({
            data: {
              carteiraId: c.id,
              tipo:       'credito',
              valor:      bonus,
              saldoApos:  c.saldo,
              descricao:  `Bônus trial — ${descontoTrialPercentual}% de desconto por ${promo.dias} dias`,
            },
          });
        }
      }

      return nova;
    });

    return res.status(201).json({
      assinatura_id: assinatura.id,
      init_point: mp.init_point,
      em_trial: emTrial,
    });
  } catch (err) {
    console.error('[AssinaturaController] Erro ao iniciar assinatura:', err);
    return res.status(500).json({ error: 'Erro ao iniciar assinatura.' });
  }
};

// ── GET /api/assinaturas/minha ───────────────────────────────────────────────

export const minhaAssinatura = async (req, res) => {
  try {
    const pacienteId = req.user.id;
    const assinatura = await prisma.assinatura.findFirst({
      where: { pacienteId, status: { in: ['ativa', 'trial', 'pendente', 'inadimplente'] } },
      include: { plano: true },
      orderBy: { criadaEm: 'desc' },
    });

    if (!assinatura) return res.status(200).json({ ativa: false });

    return res.status(200).json({
      ativa: true,
      status: assinatura.status,
      plano: {
        nome: assinatura.plano.nome,
        preco: parseFloat(assinatura.plano.preco),
        consultasIncluidas: assinatura.plano.consultasIncluidas,
      },
      consultasUsadasNoMes: assinatura.consultasUsadasNoMes,
      consultasRestantes: Math.max(0, assinatura.plano.consultasIncluidas - assinatura.consultasUsadasNoMes),
      cicloAtualInicio: assinatura.cicloAtualInicio,
      cicloAtualFim: assinatura.cicloAtualFim,
      emTrial: assinatura.emTrial,
      trialFim: assinatura.trialFim,
      canceladaEm: assinatura.canceladaEm,
    });
  } catch (err) {
    console.error('[AssinaturaController] Erro ao buscar assinatura:', err);
    return res.status(500).json({ error: 'Erro ao buscar assinatura.' });
  }
};

// ── POST /api/assinaturas/cancelar ───────────────────────────────────────────
// Cancelamento é imediato no Mercado Pago (não haverá nova cobrança), mas o
// paciente mantém acesso às consultas do plano até cicloAtualFim — não há
// estorno. O status só vira 'cancelada' quando o ciclo atual terminar (ver
// cronJobs.jobExpirarAssinaturasCanceladas).

export const cancelarAssinaturaHandler = async (req, res) => {
  try {
    const pacienteId = req.user.id;
    const assinatura = await prisma.assinatura.findFirst({
      where: { pacienteId, status: { in: ['ativa', 'trial', 'pendente'] } },
    });
    if (!assinatura) return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada.' });
    if (assinatura.canceladaEm) return res.status(400).json({ error: 'Assinatura já cancelada.' });

    if (assinatura.mpPreapprovalId) {
      try {
        await cancelarAssinaturaMP(assinatura.mpPreapprovalId);
      } catch (err) {
        console.error('[AssinaturaController] Erro ao cancelar preapproval no Mercado Pago:', err.message);
        return res.status(502).json({ error: 'Erro ao cancelar assinatura no Mercado Pago.' });
      }
    }

    await prisma.assinatura.update({
      where: { id: assinatura.id },
      data:  { canceladaEm: new Date() },
    });

    return res.status(200).json({ success: true, acesso_ate: assinatura.cicloAtualFim });
  } catch (err) {
    console.error('[AssinaturaController] Erro ao cancelar assinatura:', err);
    return res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
  }
};
