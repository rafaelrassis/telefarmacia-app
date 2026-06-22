import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PRECO = parseFloat(process.env.PRECO_CONSULTA_PADRAO || '50.00');

// ── helpers ──────────────────────────────────────────────────────────────────

function nowInBR() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function timeStr(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ── POST /api/fila/agendar ───────────────────────────────────────────────────

export const agendarConsulta = async (req, res) => {
  const { data_hora } = req.body;
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
    const horario = await prisma.sistemaHorario.findUnique({ where: { diaSemana: dow } });
    if (!horario || !horario.ativo) {
      return res.status(400).json({ error: 'O sistema não funciona neste dia da semana.' });
    }

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: patientId } });
    if (!carteira || Number(carteira.saldo) < PRECO) {
      return res.status(402).json({
        error: `Saldo insuficiente. É necessário R$ ${PRECO.toFixed(2)} para agendar.`,
      });
    }

    const fila = await prisma.$transaction(async (tx) => {
      await tx.carteira.update({
        where: { pacienteId: patientId },
        data: { saldo: { decrement: PRECO } },
      });
      return tx.filaAgendada.create({
        data: { pacienteId: patientId, dataHora, creditoDebitado: PRECO, status: 'aguardando' },
      });
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
  const patientId = req.user.id;

  try {
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

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: patientId } });
    if (!carteira || Number(carteira.saldo) < PRECO) {
      return res.status(402).json({
        error: `Saldo insuficiente. É necessário R$ ${PRECO.toFixed(2)} para atendimento imediato.`,
      });
    }

    const fila = await prisma.$transaction(async (tx) => {
      await tx.carteira.update({
        where: { pacienteId: patientId },
        data: { saldo: { decrement: PRECO } },
      });
      return tx.filaUrgente.create({
        data: { pacienteId: patientId, creditoDebitado: PRECO, status: 'aguardando' },
      });
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

    return res.status(200).json({
      id: fila.id,
      status: fila.status,
      farmaceutico: fila.farmaceutico?.name ?? null,
      aceitoEm: fila.aceitoEm,
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
    return res.status(200).json({ success: true, fila });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao aceitar atendimento urgente.' });
  }
};
