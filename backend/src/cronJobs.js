import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logAction } from './utils/logAction.js';
import { criarNotificacao } from './controllers/NotificacaoController.js';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getConfig(key, defaultVal) {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    return row ? parseFloat(row.value) : defaultVal;
  } catch { return defaultVal; }
}

async function estornarUrgente(id, pacienteId, creditoDebitado, descricao) {
  await prisma.$transaction(async (tx) => {
    await tx.filaUrgente.update({ where: { id }, data: { status: 'cancelado' } });
    const valor = Number(creditoDebitado);
    if (valor > 0) {
      const c = await tx.carteira.update({
        where: { pacienteId },
        data: { saldo: { increment: creditoDebitado } },
      });
      await tx.transacaoCarteira.create({
        data: {
          carteiraId: c.id,
          tipo:       'estorno',
          valor,
          saldoApos:  c.saldo,
          descricao,
          consultaId: id,
        },
      });
    }
  });
}

export const initCronJobs = () => {
  // ── Job 1: urgentes AGUARDANDO > N min sem farmacêutico aceitar (a cada 5 min) ──

  cron.schedule('*/5 * * * *', async () => {
    try {
      const maxMin = await getConfig('urgente_max_aguardando_min', 15);
      const limite = new Date(Date.now() - maxMin * 60 * 1000);

      const travadas = await prisma.filaUrgente.findMany({
        where: { status: 'aguardando', criadoEm: { lt: limite } },
      });

      for (const u of travadas) {
        await estornarUrgente(
          u.id, u.pacienteId, u.creditoDebitado,
          'Estorno — urgência expirada sem atendimento disponível',
        );
        await logAction(prisma, {
          consultaId: u.id, usuarioId: null, role: 'SYSTEM',
          acao: 'expirado_aguardando', detalhes: { maxMin },
        });
        await criarNotificacao({
          userId:     u.pacienteId,
          tipo:       'urgente_expirada',
          titulo:     'Não conseguimos te atender agora',
          mensagem:   'Nenhum farmacêutico estava disponível no momento. Seus créditos foram devolvidos. Tente agendar um horário.',
          consultaId: u.id,
        });
      }
      if (travadas.length > 0)
        console.log(`[cron] ${travadas.length} urgência(s) aguardando expirada(s).`);
    } catch (err) {
      console.error('[cron] Erro no job urgentes aguardando:', err.message);
    }
  });

  // ── Job 2: urgentes ACEITAS sem início (alerta 30 min / cancelar 60 min) ───

  cron.schedule('*/5 * * * *', async () => {
    try {
      const alertMin  = await getConfig('urgente_max_aceito_alerta_min',   30);
      const cancelMin = await getConfig('urgente_max_aceito_cancelar_min',  60);
      const agora     = Date.now();

      // 2a — para cancelar/devolver: aceitas > cancelMin
      const limiteCancelar = new Date(agora - cancelMin * 60 * 1000);
      const paraCancelar   = await prisma.filaUrgente.findMany({
        where: { status: 'aceito', aceitoEm: { lt: limiteCancelar } },
      });

      for (const u of paraCancelar) {
        const outroDisponivel = await prisma.pharmacistProfile.findFirst({
          where: {
            isApproved: true, isOnline: true, disponivelUrgencias: true,
            userId: { not: u.farmaceuticoId ?? undefined },
          },
        });

        if (outroDisponivel) {
          // Devolver à fila
          await prisma.filaUrgente.update({
            where: { id: u.id },
            data:  { status: 'aguardando', farmaceuticoId: null, aceitoEm: null },
          });
          if (u.farmaceuticoId) {
            await criarNotificacao({
              userId:  u.farmaceuticoId,
              tipo:    'urgente_devolvida',
              titulo:  'Atendimento devolvido à fila',
              mensagem: 'A consulta urgente foi devolvida por inatividade.',
              consultaId: u.id,
            });
          }
          await criarNotificacao({
            userId:     u.pacienteId,
            tipo:       'urgente_devolvida',
            titulo:     'Aguardando novo farmacêutico',
            mensagem:   'Seu atendimento está sendo transferido para outro profissional disponível.',
            consultaId: u.id,
          });
        } else {
          // Cancelar com estorno
          await estornarUrgente(
            u.id, u.pacienteId, u.creditoDebitado,
            'Estorno — urgência expirada: farmacêutico não iniciou atendimento',
          );
          await criarNotificacao({
            userId:     u.pacienteId,
            tipo:       'urgente_expirada',
            titulo:     'Atendimento expirado',
            mensagem:   'O farmacêutico não iniciou o atendimento a tempo. Seus créditos foram devolvidos.',
            consultaId: u.id,
          });
          if (u.farmaceuticoId) {
            await criarNotificacao({
              userId:  u.farmaceuticoId,
              tipo:    'urgente_expirada',
              titulo:  'Atendimento cancelado por inatividade',
              mensagem: 'A consulta urgente foi cancelada porque o atendimento não foi iniciado a tempo.',
              consultaId: u.id,
            });
          }
        }
        await logAction(prisma, {
          consultaId: u.id, usuarioId: u.farmaceuticoId ?? null,
          role: 'SYSTEM', acao: 'expirado_aceito',
          detalhes: { cancelMin, devolvida: !!outroDisponivel },
        });
      }

      // 2b — alertar farmacêutico na janela (alertMin, alertMin+5): dispara exatamente 1 vez por urgente
      const alertLower = new Date(agora - (alertMin + 5) * 60 * 1000);
      const alertUpper = new Date(agora - alertMin * 60 * 1000);
      const paraAlertar = await prisma.filaUrgente.findMany({
        where: { status: 'aceito', aceitoEm: { gte: alertLower, lt: alertUpper } },
      });
      for (const u of paraAlertar) {
        if (!u.farmaceuticoId) continue;
        await criarNotificacao({
          userId:     u.farmaceuticoId,
          tipo:       'urgente_alerta_inicio',
          titulo:     'Inicie o atendimento urgente',
          mensagem:   `A consulta urgente foi aceita há mais de ${alertMin} min. Inicie o atendimento ou ela será cancelada.`,
          consultaId: u.id,
        });
      }

      if (paraCancelar.length > 0)
        console.log(`[cron] ${paraCancelar.length} urgência(s) aceita(s) expirada(s).`);
    } catch (err) {
      console.error('[cron] Erro no job urgentes aceitas:', err.message);
    }
  });

  // ── Job 3: em_atendimento > 4h — alerta farmacêutico + log admin (a cada 30 min) ──

  cron.schedule('*/30 * * * *', async () => {
    try {
      const maxH   = await getConfig('atendimento_max_duracao_h', 4);
      const limite = new Date(Date.now() - maxH * 3600 * 1000);

      // Urgentes em atendimento (proxy: aceitoEm)
      const urgentesLongas = await prisma.filaUrgente.findMany({
        where: { status: 'em_atendimento', aceitoEm: { lt: limite } },
      });
      for (const u of urgentesLongas) {
        if (u.farmaceuticoId) {
          await criarNotificacao({
            userId:     u.farmaceuticoId,
            tipo:       'atendimento_longo',
            titulo:     'Atendimento em aberto há mais de 4h',
            mensagem:   'Verifique o atendimento urgente e conclua ou encerre conforme necessário.',
            consultaId: u.id,
          });
        }
        await logAction(prisma, {
          consultaId: u.id, usuarioId: u.farmaceuticoId ?? null,
          role: 'SYSTEM', acao: 'alerta_duracao',
          detalhes: { tipo: 'urgente', maxH },
        });
      }

      // Agendadas em atendimento (proxy: dataHora)
      const agendadasLongas = await prisma.filaAgendada.findMany({
        where: { status: 'em_atendimento', dataHora: { lt: limite } },
      });
      for (const a of agendadasLongas) {
        if (a.farmaceuticoId) {
          await criarNotificacao({
            userId:     a.farmaceuticoId,
            tipo:       'atendimento_longo',
            titulo:     'Atendimento em aberto há mais de 4h',
            mensagem:   'Verifique o atendimento agendado e conclua ou encerre conforme necessário.',
            consultaId: a.id,
          });
        }
        await logAction(prisma, {
          consultaId: a.id, usuarioId: a.farmaceuticoId ?? null,
          role: 'SYSTEM', acao: 'alerta_duracao',
          detalhes: { tipo: 'agendada', maxH },
        });
      }

      const total = urgentesLongas.length + agendadasLongas.length;
      if (total > 0)
        console.log(`[cron] ${total} atendimento(s) longo(s) alertado(s).`);
    } catch (err) {
      console.error('[cron] Erro no job atendimentos longos:', err.message);
    }
  });

  console.log('[cron] Jobs iniciados: urgentes aguardando/aceitas (5min) | atendimentos longos (30min).');
};
