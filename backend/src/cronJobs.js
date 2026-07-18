import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logAction } from './utils/logAction.js';
import { criarNotificacao } from './controllers/NotificacaoController.js';
import { notifyEstorno, notifyLembreteConsulta, notifyLembreteMedicacao } from './services/pushService.js';
import { logger } from './utils/logger.js';
import { VERIFICATION_TOKEN_TTL_MS } from './utils/emailVerificationToken.js';

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

// ── Job 1: urgentes AGUARDANDO > N min sem farmacêutico aceitar (a cada 5 min) ──

export async function jobExpirarUrgentesAguardando() {
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
      await notifyEstorno(u.pacienteId);
    }
    if (travadas.length > 0)
      console.log(`[cron] ${travadas.length} urgência(s) aguardando expirada(s).`);
  } catch (err) {
    console.error('[cron] Erro no job urgentes aguardando:', err.message);
  }
}

// ── Job 2: urgentes ACEITAS sem início (alerta 30 min / cancelar 60 min) ───

export async function jobExpirarUrgentesAceitas() {
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
        await notifyEstorno(u.pacienteId);
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
}

// ── Job 3: em_atendimento > 4h — alerta farmacêutico + log admin (a cada 30 min) ──

export async function jobAlertarAtendimentosLongos() {
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
}

// ── Job 4: agendadas AGUARDANDO cujo horário já passou + tolerância (a cada 15 min) ──
// Nota: FilaUrgente aguardando já expira no Job 1 (urgente_max_aguardando_min) — não duplicado aqui.

export async function jobExpirarAgendadasOrfas() {
  try {
    const toleranciaMin = await getConfig('tolerancia_expiracao_agendada_min', 30);
    const limite = new Date(Date.now() - toleranciaMin * 60 * 1000);

    const orfas = await prisma.filaAgendada.findMany({
      where: { status: 'aguardando', dataHora: { lt: limite } },
    });

    for (const f of orfas) {
      const creditoDevolvido = Number(f.creditoDebitado);

      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE "FilaAgendada" SET status = 'cancelado', "motivo_cancelamento" = $2 WHERE id = $1`,
          f.id, 'Expirada — nenhum farmacêutico aceitou'
        );
        if (creditoDevolvido > 0) {
          const c = await tx.carteira.update({
            where: { pacienteId: f.pacienteId },
            data: { saldo: { increment: creditoDevolvido } },
          });
          await tx.transacaoCarteira.create({
            data: {
              carteiraId: c.id,
              tipo:       'estorno',
              valor:      creditoDevolvido,
              saldoApos:  c.saldo,
              descricao:  'Estorno — consulta agendada expirada sem farmacêutico',
              consultaId: f.id,
            },
          });
        }
      });

      await logAction(prisma, {
        consultaId: f.id, usuarioId: null, role: 'SYSTEM',
        acao: 'expirada', detalhes: { tipo: 'agendada', toleranciaMin },
      });
      await criarNotificacao({
        userId:     f.pacienteId,
        tipo:       'estorno',
        titulo:     'Consulta expirada',
        mensagem:   'Nenhum farmacêutico aceitou sua consulta agendada a tempo. Seus créditos foram devolvidos.',
        consultaId: f.id,
      });
      await notifyEstorno(f.pacienteId);
    }
    if (orfas.length > 0)
      console.log(`[cron] ${orfas.length} consulta(s) agendada(s) expirada(s) sem aceite.`);
  } catch (err) {
    console.error('[cron] Erro no job de expiração de agendadas:', err.message);
  }
}

// ── Job 5: lembrete de consulta agendada ~1h antes (a cada 15 min) ──────────

export async function jobLembreteConsulta() {
  try {
    const agora   = Date.now();
    const janelaMin = new Date(agora + 45 * 60 * 1000);
    const janelaMax = new Date(agora + 75 * 60 * 1000);

    let candidatas = [];
    try {
      candidatas = await prisma.$queryRawUnsafe(
        `SELECT id, "pacienteId", "dataHora" FROM "FilaAgendada"
         WHERE status = 'aceito' AND "dataHora" BETWEEN $1 AND $2 AND "lembrete_enviado" = FALSE`,
        janelaMin, janelaMax
      );
    } catch { /* coluna ainda não existe — sem lembrete até rodar a migração */ }

    for (const f of candidatas) {
      const hora = new Date(f.dataHora).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
      });
      await notifyLembreteConsulta(f.pacienteId, hora);
      await prisma.$executeRawUnsafe(
        `UPDATE "FilaAgendada" SET "lembrete_enviado" = TRUE WHERE id = $1`, f.id
      );
    }
    if (candidatas.length > 0)
      console.log(`[cron] ${candidatas.length} lembrete(s) de consulta enviado(s).`);
  } catch (err) {
    console.error('[cron] Erro no job de lembrete de consulta:', err.message);
  }
}

// ── Job 6: cadastros por credenciais não confirmados há mais de 24h (hora em hora) ──
// Google já vem com emailVerified preenchido (ver AuthController.googleLogin)
// e nunca cai neste filtro. Proteção crítica: qualquer movimento financeiro
// ou consulta (como paciente OU como farmacêutico) tira a conta da exclusão
// automática e é sinalizado em log para revisão manual — ver
// especificacoes/spec-confirmacao-email.md.

export async function jobExcluirCadastrosNaoConfirmados() {
  try {
    const limite = new Date(Date.now() - VERIFICATION_TOKEN_TTL_MS);

    const candidatos = await prisma.user.findMany({
      where: {
        emailVerified: null,
        password: { not: null },
        googleId: null,
        createdAt: { lt: limite },
      },
      select: { id: true, email: true },
    });

    let excluidos = 0;
    for (const u of candidatos) {
      const temMovimento = await prisma.user.findFirst({
        where: {
          id: u.id,
          OR: [
            { pagamentos: { some: {} } },
            { filaAgendadaComoPaciente: { some: {} } },
            { filaUrgenteComoPaciente: { some: {} } },
            { filaAgendadaComoFarmaceutico: { some: {} } },
            { filaUrgenteComoFarmaceutico: { some: {} } },
          ],
        },
        select: { id: true },
      });

      if (temMovimento) {
        logger.warn('cadastro-nao-confirmado-com-movimento', { userId: u.id });
        continue;
      }

      try {
        await prisma.user.delete({ where: { id: u.id } });
        excluidos += 1;
        logger.info('cadastro-nao-confirmado-excluido', { userId: u.id });
      } catch (err) {
        logger.error('cadastro-nao-confirmado-falha-exclusao', { userId: u.id, message: err.message });
      }
    }
    if (excluidos > 0)
      console.log(`[cron] ${excluidos} cadastro(s) não confirmado(s) excluído(s).`);
  } catch (err) {
    console.error('[cron] Erro no job de exclusão de cadastros não confirmados:', err.message);
  }
}

// ── Job 7: lembretes de medicação nos horários configurados (a cada 5 min) ──
// Janela do tick: [HH:MM arredondado ao múltiplo de 5, +5 min) em
// America/Sao_Paulo — cobre horários fora do múltiplo (ex.: 08:03).

export async function jobLembretesMedicacao() {
  try {
    const agora = new Date();
    const [horaSp, minSp] = agora
      .toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false, hour: '2-digit', minute: '2-digit' })
      .split(':')
      .map(Number);
    const minTick = minSp - (minSp % 5);
    const janela = Array.from({ length: 5 }, (_, i) =>
      `${String(horaSp).padStart(2, '0')}:${String(minTick + i).padStart(2, '0')}`
    );

    // Anti-duplicação: só dispara se ultimoDisparoEm for null ou > 20 min atrás
    const limiteDisparo = new Date(agora.getTime() - 20 * 60 * 1000);
    const elegiveis = await prisma.lembreteMedicacao.findMany({
      where: {
        ativo:    true,
        horarios: { hasSome: janela },
        OR: [
          { ultimoDisparoEm: null },
          { ultimoDisparoEm: { lt: limiteDisparo } },
        ],
      },
      include: { dependent: { select: { nome: true } } },
    });

    let enviados = 0;
    for (const l of elegiveis) {
      try {
        const quem     = l.dependent?.nome ? ` (para ${l.dependent.nome.split(' ')[0]})` : '';
        const doseStr  = l.dose ? ` — ${l.dose}` : '';
        await notifyLembreteMedicacao(l.pacienteId, l.medicamento, l.dose);
        await criarNotificacao({
          userId:   l.pacienteId,
          tipo:     'lembrete_medicacao',
          titulo:   'Hora do medicamento',
          mensagem: `${l.medicamento}${doseStr}${quem}`,
        });
        await prisma.lembreteMedicacao.update({
          where: { id: l.id },
          data:  { ultimoDisparoEm: new Date() },
        });
        enviados += 1;
      } catch (err) {
        console.error(`[cron] Falha ao disparar lembrete de medicação ${l.id}:`, err.message);
      }
    }
    if (enviados > 0)
      console.log(`[cron] ${enviados} lembrete(s) de medicação enviado(s).`);
  } catch (err) {
    console.error('[cron] Erro no job de lembretes de medicação:', err.message);
  }
}

export const initCronJobs = () => {
  if (process.env.NODE_ENV === 'test') {
    console.log('[cron] NODE_ENV=test — jobs não agendados (invocar as funções diretamente nos testes).');
    return;
  }

  cron.schedule('*/5 * * * *',  jobExpirarUrgentesAguardando);
  cron.schedule('*/5 * * * *',  jobExpirarUrgentesAceitas);
  cron.schedule('*/30 * * * *', jobAlertarAtendimentosLongos);
  cron.schedule('*/15 * * * *', jobExpirarAgendadasOrfas);
  cron.schedule('*/15 * * * *', jobLembreteConsulta);
  cron.schedule('0 * * * *',    jobExcluirCadastrosNaoConfirmados);
  cron.schedule('*/5 * * * *',  jobLembretesMedicacao);

  console.log('[cron] Jobs iniciados: urgentes aguardando/aceitas (5min) | agendadas órfãs (15min) | atendimentos longos (30min) | lembrete de consulta (15min) | cadastros não confirmados (hora em hora) | lembretes de medicação (5min).');
};
