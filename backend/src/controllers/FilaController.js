import { PrismaClient } from '@prisma/client';
import { logAction } from '../utils/logAction.js';
import { criarNotificacao } from './NotificacaoController.js';

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────

async function getPreco() {
  const row = await prisma.systemConfig.findUnique({ where: { key: 'preco_consulta' } });
  return row ? parseFloat(row.value) : parseFloat(process.env.PRECO_CONSULTA_PADRAO || '50.00');
}

function nowInBR() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function timeStr(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ── POST /api/fila/agendar ───────────────────────────────────────────────────

export const agendarConsulta = async (req, res) => {
  const { data_hora, triagem, dependentId, whatsapp_contato, modalidade_atend } = req.body;
  if (!data_hora) return res.status(400).json({ error: 'data_hora é obrigatória.' });

  // Parse date components directly from string to avoid TZ issues in day-of-week check
  const datePart = String(data_hora).split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return res.status(400).json({ error: 'Formato de data inválido.' });

  const refDate = new Date(y, m - 1, d);
  if (isNaN(refDate.getTime())) return res.status(400).json({ error: 'Data inválida.' });

  const now = nowInBR();
  const dataHora = new Date(data_hora);

  if (dataHora <= now) return res.status(400).json({ error: 'Horário já passou.' });

  const patientId = req.user.id;
  const dow = refDate.getDay();

  try {
    const PRECO = await getPreco();

    const horario = await prisma.sistemaHorario.findUnique({ where: { diaSemana: dow } });
    if (!horario || !horario.ativo) {
      return res.status(400).json({ error: 'O sistema não funciona neste dia da semana.' });
    }

    // Valida dependentId: deve pertencer ao titular
    if (dependentId) {
      const dep = await prisma.dependentProfile.findFirst({
        where: { id: dependentId, ownerId: patientId, ativo: true },
      });
      if (!dep) return res.status(403).json({ error: 'Dependente não encontrado ou não pertence a esta conta.' });
    }

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: patientId } });
    if (!carteira || Number(carteira.saldo) < PRECO) {
      return res.status(402).json({
        error: `Saldo insuficiente. É necessário R$ ${PRECO.toFixed(2)} para agendar.`,
      });
    }

    const fila = await prisma.$transaction(async (tx) => {
      const c = await tx.carteira.update({
        where: { pacienteId: patientId },
        data:  { saldo: { decrement: PRECO } },
      });
      const nova = await tx.filaAgendada.create({
        data: {
          pacienteId: patientId,
          dataHora,
          creditoDebitado: PRECO,
          status: 'aguardando',
          ...(dependentId && { dependentId }),
        },
      });
      await tx.transacaoCarteira.create({
        data: {
          carteiraId: c.id,
          tipo:       'debito',
          valor:      PRECO,
          saldoApos:  c.saldo,
          descricao:  'Consulta agendada',
          consultaId: nova.id,
        },
      });
      if (triagem || whatsapp_contato || modalidade_atend) {
        const sets = [];
        const vals = [];
        if (triagem)          { sets.push(`triagem = $${vals.length+1}::jsonb`);          vals.push(JSON.stringify(triagem)); }
        if (whatsapp_contato) { sets.push(`whatsapp_contato = $${vals.length+1}`);        vals.push(whatsapp_contato.replace(/\D/g,'')); }
        if (modalidade_atend) { sets.push(`modalidade_atend = $${vals.length+1}`);        vals.push(modalidade_atend); }
        try {
          await tx.$executeRawUnsafe(
            `UPDATE "FilaAgendada" SET ${sets.join(', ')} WHERE id = $${vals.length+1}`,
            ...vals, nova.id
          );
        } catch {}
      }
      return nova;
    });

    return res.status(201).json({
      id: fila.id,
      data_hora: fila.dataHora,
      status: fila.status,
      preco_cobrado: PRECO,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao entrar na fila de agendamentos.' });
  }
};

// ── POST /api/fila/urgente ───────────────────────────────────────────────────

export const agendarUrgente = async (req, res) => {
  const { triagem, dependentId, whatsapp_contato, modalidade_atend } = req.body;
  const patientId = req.user.id;

  try {
    const PRECO = await getPreco();

    const br = nowInBR();
    const dow = br.getDay();
    const horario = await prisma.sistemaHorario.findUnique({ where: { diaSemana: dow } });

    if (!horario || !horario.ativo) {
      return res.status(400).json({ error: 'O sistema está fechado hoje.' });
    }

    const agora = timeStr(br);
    if (agora < horario.horaInicio || agora >= horario.horaFim) {
      return res.status(400).json({
        error: `Fora do horário. O sistema funciona das ${horario.horaInicio} às ${horario.horaFim}.`,
      });
    }

    // Verifica solicitação ativa PRIMEIRO (permite retomar polling sem erro de saldo)
    const ativo = await prisma.filaUrgente.findFirst({
      where: { pacienteId: patientId, status: 'aguardando' },
    });
    if (ativo) {
      return res.status(400).json({
        error: 'Você já tem uma solicitação urgente em andamento.',
        id: ativo.id,
      });
    }

    // Valida dependentId: deve pertencer ao titular
    if (dependentId) {
      const dep = await prisma.dependentProfile.findFirst({
        where: { id: dependentId, ownerId: patientId, ativo: true },
      });
      if (!dep) return res.status(403).json({ error: 'Dependente não encontrado ou não pertence a esta conta.' });
    }

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: patientId } });
    if (!carteira || Number(carteira.saldo) < PRECO) {
      return res.status(402).json({
        error: `Saldo insuficiente. É necessário R$ ${PRECO.toFixed(2)} para atendimento imediato.`,
      });
    }

    const fila = await prisma.$transaction(async (tx) => {
      const c = await tx.carteira.update({
        where: { pacienteId: patientId },
        data:  { saldo: { decrement: PRECO } },
      });
      const nova = await tx.filaUrgente.create({
        data: {
          pacienteId: patientId,
          creditoDebitado: PRECO,
          status: 'aguardando',
          ...(dependentId && { dependentId }),
        },
      });
      await tx.transacaoCarteira.create({
        data: {
          carteiraId: c.id,
          tipo:       'debito',
          valor:      PRECO,
          saldoApos:  c.saldo,
          descricao:  'Consulta urgente',
          consultaId: nova.id,
        },
      });
      if (triagem || whatsapp_contato || modalidade_atend) {
        const sets = [];
        const vals = [];
        if (triagem)          { sets.push(`triagem = $${vals.length+1}::jsonb`);   vals.push(JSON.stringify(triagem)); }
        if (whatsapp_contato) { sets.push(`whatsapp_contato = $${vals.length+1}`); vals.push(whatsapp_contato.replace(/\D/g,'')); }
        if (modalidade_atend) { sets.push(`modalidade_atend = $${vals.length+1}`); vals.push(modalidade_atend); }
        try {
          await tx.$executeRawUnsafe(
            `UPDATE "FilaUrgente" SET ${sets.join(', ')} WHERE id = $${vals.length+1}`,
            ...vals, nova.id
          );
        } catch {}
      }
      return nova;
    });

    return res.status(201).json({ id: fila.id, status: fila.status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao entrar na fila urgente.' });
  }
};

// ── GET /api/fila/urgente/:id (paciente faz polling) ────────────────────────

export const statusUrgente = async (req, res) => {
  const { id } = req.params;
  const patientId = req.user.id;

  try {
    const fila = await prisma.filaUrgente.findFirst({
      where: { id, pacienteId: patientId },
      include: { farmaceutico: { select: { name: true } } },
    });
    if (!fila) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    let whatsappContato = null, modalidadeAtend = 'whatsapp';
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT whatsapp_contato, modalidade_atend FROM "FilaUrgente" WHERE id = $1`, id
      );
      if (rows.length > 0) {
        whatsappContato = rows[0].whatsapp_contato ?? null;
        modalidadeAtend = rows[0].modalidade_atend ?? 'whatsapp';
      }
    } catch {}

    return res.status(200).json({
      id: fila.id,
      status: fila.status,
      farmaceutico: fila.farmaceutico?.name ?? null,
      aceitoEm: fila.aceitoEm,
      whatsappContato,
      modalidadeAtend,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar status.' });
  }
};

// ── GET /api/fila/agendadas (farmacêutico lista fila) ───────────────────────

export const listarAgendadas = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') {
    return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
  }
  const { status = 'aguardando' } = req.query;

  try {
    const fila = await prisma.filaAgendada.findMany({
      where: { status },
      include: { paciente: { select: { name: true, email: true } } },
      orderBy: { dataHora: 'asc' },
    });
    return res.status(200).json(fila);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar fila de agendamentos.' });
  }
};

// ── GET /api/fila/urgentes (farmacêutico lista urgentes) ────────────────────

export const listarUrgentes = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') {
    return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
  }
  const { status = 'aguardando' } = req.query;

  try {
    const fila = await prisma.filaUrgente.findMany({
      where: { status },
      include: { paciente: { select: { name: true, email: true } } },
      orderBy: { criadoEm: 'asc' },
    });
    return res.status(200).json(fila);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar fila urgente.' });
  }
};

// ── POST /api/fila/agendadas/:id/aceitar ────────────────────────────────────

export const aceitarAgendada = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') {
    return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
  }
  const { id } = req.params;
  const pharmacistId = req.user.id;

  try {
    const [agEmAt, urEmAt] = await Promise.all([
      prisma.filaAgendada.findFirst({ where: { farmaceuticoId: pharmacistId, status: 'em_atendimento' } }),
      prisma.filaUrgente.findFirst({ where: { farmaceuticoId: pharmacistId, status: 'em_atendimento' } }),
    ]);
    if (agEmAt || urEmAt) {
      return res.status(400).json({ error: 'Conclua o atendimento atual antes de aceitar outro.' });
    }

    const result = await prisma.filaAgendada.updateMany({
      where: { id, status: 'aguardando' },
      data: { status: 'aceito', farmaceuticoId: pharmacistId },
    });

    if (result.count === 0) {
      return res.status(409).json({ error: 'Esta consulta já foi aceita por outro farmacêutico.' });
    }

    const fila = await prisma.filaAgendada.findUnique({
      where: { id },
      include: { paciente: { select: { name: true, email: true } } },
    });
    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'aceito', detalhes: { tipo: 'agendada' } });
    await criarNotificacao({
      userId:     fila.pacienteId,
      tipo:       'consulta_aceita',
      titulo:     'Consulta confirmada!',
      mensagem:   'Um farmacêutico aceitou sua consulta agendada.',
      consultaId: id,
    });
    return res.status(200).json({ success: true, fila });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao aceitar consulta agendada.' });
  }
};

// ── POST /api/fila/urgente/:id/aceitar ──────────────────────────────────────

export const aceitarUrgente = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') {
    return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
  }
  const { id } = req.params;
  const pharmacistId = req.user.id;

  try {
    const [agEmAt, urEmAt] = await Promise.all([
      prisma.filaAgendada.findFirst({ where: { farmaceuticoId: pharmacistId, status: 'em_atendimento' } }),
      prisma.filaUrgente.findFirst({ where: { farmaceuticoId: pharmacistId, status: 'em_atendimento' } }),
    ]);
    if (agEmAt || urEmAt) {
      return res.status(400).json({ error: 'Conclua o atendimento atual antes de aceitar outro.' });
    }

    const result = await prisma.filaUrgente.updateMany({
      where: { id, status: 'aguardando' },
      data: { status: 'aceito', farmaceuticoId: pharmacistId, aceitoEm: new Date() },
    });

    if (result.count === 0) {
      return res.status(409).json({ error: 'Esta solicitação já foi aceita ou expirou.' });
    }

    const fila = await prisma.filaUrgente.findUnique({
      where: { id },
      include: { paciente: { select: { name: true, email: true } } },
    });
    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'aceito', detalhes: { tipo: 'urgente' } });
    await criarNotificacao({
      userId:     fila.pacienteId,
      tipo:       'consulta_aceita',
      titulo:     'Farmacêutico a caminho!',
      mensagem:   `${fila.paciente?.name?.split(' ')[0] ?? 'Um farmacêutico'} aceitou seu atendimento urgente.`,
      consultaId: id,
    });
    return res.status(200).json({ success: true, fila });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao aceitar atendimento urgente.' });
  }
};

// ── GET /api/fila/urgente/ativa (paciente verifica se tem urgência ativa) ────

export const minhaUrgenteAtiva = async (req, res) => {
  const patientId = req.user.id;
  try {
    const urgente = await prisma.filaUrgente.findFirst({
      where: { pacienteId: patientId, status: { in: ['aguardando', 'aceito'] } },
      include: { farmaceutico: { select: { name: true } } },
      orderBy: { criadoEm: 'desc' },
    });
    if (!urgente) return res.status(200).json({ urgente: null });

    let whatsappContato = null, modalidadeAtend = 'whatsapp';
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT whatsapp_contato, modalidade_atend FROM "FilaUrgente" WHERE id = $1`, urgente.id
      );
      if (rows.length > 0) {
        whatsappContato = rows[0].whatsapp_contato ?? null;
        modalidadeAtend = rows[0].modalidade_atend ?? 'whatsapp';
      }
    } catch {}

    return res.status(200).json({
      urgente: {
        id: urgente.id,
        status: urgente.status,
        farmaceutico: urgente.farmaceutico?.name ?? null,
        whatsappContato,
        modalidadeAtend,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar urgência ativa.' });
  }
};

// ── POST /api/fila/urgente/:id/cancelar ─────────────────────────────────────

export const cancelarUrgente = async (req, res) => {
  const { id } = req.params;
  const patientId = req.user.id;

  try {
    const fila = await prisma.filaUrgente.findFirst({ where: { id, pacienteId: patientId } });
    if (!fila) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    if (fila.status === 'cancelado') return res.status(400).json({ error: 'Já cancelada.' });
    if (fila.status === 'concluido') return res.status(400).json({ error: 'Consulta já concluída.' });

    const creditoDevolvido = Number(fila.creditoDebitado);

    await prisma.$transaction(async (tx) => {
      await tx.filaUrgente.update({ where: { id }, data: { status: 'cancelado' } });
      if (creditoDevolvido > 0) {
        const c = await tx.carteira.update({
          where: { pacienteId: patientId },
          data:  { saldo: { increment: fila.creditoDebitado } },
        });
        await tx.transacaoCarteira.create({
          data: {
            carteiraId: c.id,
            tipo:       'estorno',
            valor:      creditoDevolvido,
            saldoApos:  c.saldo,
            descricao:  'Estorno — cancelamento de consulta urgente',
            consultaId: id,
          },
        });
      }
    });

    await logAction(prisma, { consultaId: id, usuarioId: patientId, role: req.user.role, acao: 'cancelado', detalhes: { tipo: 'urgente', cancelado_por: req.user.role } });
    if (creditoDevolvido > 0) {
      await logAction(prisma, { consultaId: id, usuarioId: patientId, role: req.user.role, acao: 'reembolso', detalhes: { tipo: 'urgente', valor: creditoDevolvido } });
      await criarNotificacao({
        userId:     patientId,
        tipo:       'estorno',
        titulo:     'Créditos devolvidos',
        mensagem:   `R$ ${creditoDevolvido.toFixed(2).replace('.', ',')} foram devolvidos à sua carteira.`,
        consultaId: id,
      });
    }
    return res.status(200).json({ success: true, creditoDevolvido });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cancelar urgência.' });
  }
};

// ── POST /api/fila/agendadas/:id/cancelar ───────────────────────────────────

export const cancelarAgendada = async (req, res) => {
  const { id } = req.params;
  const patientId = req.user.id;

  try {
    const fila = await prisma.filaAgendada.findFirst({ where: { id, pacienteId: patientId } });
    if (!fila) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    if (fila.status === 'cancelado') return res.status(400).json({ error: 'Já cancelado.' });
    if (fila.status === 'concluido') return res.status(400).json({ error: 'Consulta já concluída.' });

    const creditoDevolvido = Number(fila.creditoDebitado);

    await prisma.$transaction(async (tx) => {
      await tx.filaAgendada.update({ where: { id }, data: { status: 'cancelado' } });
      if (creditoDevolvido > 0) {
        const c = await tx.carteira.update({
          where: { pacienteId: patientId },
          data:  { saldo: { increment: fila.creditoDebitado } },
        });
        await tx.transacaoCarteira.create({
          data: {
            carteiraId: c.id,
            tipo:       'estorno',
            valor:      creditoDevolvido,
            saldoApos:  c.saldo,
            descricao:  'Estorno — cancelamento de consulta agendada',
            consultaId: id,
          },
        });
      }
    });

    await logAction(prisma, { consultaId: id, usuarioId: patientId, role: req.user.role, acao: 'cancelado', detalhes: { tipo: 'agendada', cancelado_por: req.user.role } });
    if (creditoDevolvido > 0) {
      await logAction(prisma, { consultaId: id, usuarioId: patientId, role: req.user.role, acao: 'reembolso', detalhes: { tipo: 'agendada', valor: creditoDevolvido } });
      await criarNotificacao({
        userId:     patientId,
        tipo:       'estorno',
        titulo:     'Créditos devolvidos',
        mensagem:   `R$ ${creditoDevolvido.toFixed(2).replace('.', ',')} foram devolvidos à sua carteira.`,
        consultaId: id,
      });
    }
    return res.status(200).json({ success: true, creditoDevolvido });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
  }
};
