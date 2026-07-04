import { PrismaClient } from '@prisma/client';
import { criarNotificacao } from './NotificacaoController.js';

const prisma = new PrismaClient();

// ── GET /api/farmaceutico/bloqueios ──────────────────────────────────────────
// Lista bloqueios futuros do farmacêutico logado

export const listarBloqueios = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const pharmacistId = req.user.id;
  try {
    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: { pharmacistId, dataFim: { gte: new Date() } },
      orderBy: { dataInicio: 'asc' },
    });
    return res.status(200).json(bloqueios);
  } catch (err) {
    console.error('listarBloqueios error:', err);
    return res.status(500).json({ error: 'Erro ao buscar bloqueios.' });
  }
};

// ── POST /api/farmaceutico/bloqueios ─────────────────────────────────────────
// Cria bloqueio com detecção de conflitos

export const criarBloqueio = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const pharmacistId = req.user.id;
  const { dataInicio, dataFim, motivo, forcar = false } = req.body;

  if (!dataInicio || !dataFim) {
    return res.status(400).json({ error: 'dataInicio e dataFim são obrigatórios.' });
  }

  const inicio = new Date(dataInicio);
  const fim    = new Date(dataFim);

  if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || inicio >= fim) {
    return res.status(400).json({ error: 'Intervalo de bloqueio inválido.' });
  }
  if (inicio < new Date()) {
    return res.status(400).json({ error: 'Não é possível criar bloqueio no passado.' });
  }

  try {
    if (!forcar) {
      const [agendadasComFarm, appointmentsConflito] = await Promise.all([
        prisma.filaAgendada.findMany({
          where: {
            farmaceuticoId: pharmacistId,
            status: { in: ['aguardando', 'aceito', 'em_atendimento'] },
            dataHora: { gte: inicio, lte: fim },
          },
          include: { paciente: { select: { name: true } } },
        }),
        prisma.appointment.findMany({
          where: {
            pharmacistId,
            status: { in: ['AGENDADO', 'PENDENTE_PAGAMENTO'] },
            dateTime: { gte: inicio, lte: fim },
          },
          include: { patient: { select: { name: true } } },
        }),
      ]);

      const conflitos = [
        ...agendadasComFarm.map((f) => ({
          id:          f.id,
          tipo:        'agendada',
          dataHora:    f.dataHora,
          pacienteNome: f.paciente?.name ?? 'Paciente',
        })),
        ...appointmentsConflito.map((a) => ({
          id:          a.id,
          tipo:        'appointment',
          dataHora:    a.dateTime,
          pacienteNome: a.patient?.name ?? 'Paciente',
        })),
      ];

      if (conflitos.length > 0) {
        return res.status(409).json({
          error:    'Há consultas neste período.',
          conflitos,
        });
      }
    }

    // Cria o bloqueio e remove slots livres da Availability no período
    const bloqueio = await prisma.$transaction(async (tx) => {
      const b = await tx.bloqueioAgenda.create({
        data: {
          pharmacistId,
          dataInicio: inicio,
          dataFim:    fim,
          motivo:     motivo?.trim() || null,
        },
      });
      await tx.availability.deleteMany({
        where: { pharmacistId, isBooked: false, dateTime: { gte: inicio, lte: fim } },
      });
      return b;
    });

    // Quando forçado, notifica pacientes das consultas aceitas afetadas
    if (forcar) {
      const [agAfetadas, aptsAfetados] = await Promise.all([
        prisma.filaAgendada.findMany({
          where: {
            farmaceuticoId: pharmacistId,
            status: { in: ['aceito', 'em_atendimento'] },
            dataHora: { gte: inicio, lte: fim },
          },
          select: { id: true, pacienteId: true },
        }),
        prisma.appointment.findMany({
          where: {
            pharmacistId,
            status: { in: ['AGENDADO', 'PENDENTE_PAGAMENTO'] },
            dateTime: { gte: inicio, lte: fim },
          },
          select: { id: true, patientId: true },
        }),
      ]);

      const notifs = [
        ...agAfetadas.map((f) =>
          criarNotificacao({
            userId:     f.pacienteId,
            tipo:       'consulta_afetada_bloqueio',
            titulo:     'Reagendamento necessário',
            mensagem:   'O farmacêutico responsável pela sua consulta ficará indisponível nesse período. Por favor, reagende.',
            consultaId: f.id,
          })
        ),
        ...aptsAfetados.map((a) =>
          criarNotificacao({
            userId:     a.patientId,
            tipo:       'consulta_afetada_bloqueio',
            titulo:     'Reagendamento necessário',
            mensagem:   'O farmacêutico responsável pela sua consulta ficará indisponível nesse período. Por favor, reagende.',
            consultaId: a.id,
          })
        ),
      ];
      await Promise.allSettled(notifs);
    }

    return res.status(201).json(bloqueio);
  } catch (err) {
    console.error('criarBloqueio error:', err);
    return res.status(500).json({ error: 'Erro ao criar bloqueio.' });
  }
};

// ── DELETE /api/farmaceutico/bloqueios/:id ───────────────────────────────────

export const excluirBloqueio = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const pharmacistId = req.user.id;
  const { id } = req.params;

  try {
    const bloqueio = await prisma.bloqueioAgenda.findUnique({ where: { id } });
    if (!bloqueio) return res.status(404).json({ error: 'Bloqueio não encontrado.' });
    if (bloqueio.pharmacistId !== pharmacistId) return res.status(403).json({ error: 'Sem permissão.' });

    await prisma.bloqueioAgenda.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('excluirBloqueio error:', err);
    return res.status(500).json({ error: 'Erro ao excluir bloqueio.' });
  }
};
