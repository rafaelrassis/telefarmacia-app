import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/avaliacoes
// Body: { consulta_id, tipo, nota, comentario }
// tipo: "appointment" | "agendada" | "urgente"
export const avaliarConsulta = async (req, res) => {
  try {
    const { consulta_id, appointment_id, tipo = 'appointment', nota, comentario } = req.body;
    const pacienteId = req.user.id;
    const id = consulta_id || appointment_id;

    if (!id) return res.status(400).json({ error: 'consulta_id é obrigatório.' });

    const notaNum = parseInt(nota, 10);
    if (!notaNum || notaNum < 1 || notaNum > 5) {
      return res.status(422).json({ error: 'Nota deve ser um inteiro de 1 a 5.' });
    }

    if (tipo === 'appointment') {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { avaliacao: true },
      });
      if (!appointment) return res.status(404).json({ error: 'Consulta não encontrada.' });
      if (appointment.patientId !== pacienteId) return res.status(403).json({ error: 'Sem permissão.' });
      if (appointment.status !== 'CONCLUIDO') {
        return res.status(400).json({ error: 'Apenas consultas concluídas podem ser avaliadas.' });
      }
      if (appointment.avaliacao) {
        return res.status(409).json({ error: 'Esta consulta já foi avaliada.' });
      }
      const avaliacao = await prisma.avaliacao.create({
        data: {
          pacienteId,
          pharmacistId: appointment.pharmacistId,
          appointmentId: id,
          nota: notaNum,
          comentario: comentario?.trim()?.slice(0, 500) || null,
        },
      });
      return res.status(201).json({ success: true, avaliacao });
    }

    if (tipo === 'agendada') {
      const fila = await prisma.filaAgendada.findFirst({
        where: { id },
        include: { avaliacao: true },
      });
      if (!fila) return res.status(404).json({ error: 'Consulta não encontrada.' });
      if (fila.pacienteId !== pacienteId) {
        const dep = await prisma.dependentProfile.findFirst({ where: { id: fila.dependentId ?? '', ownerId: pacienteId } });
        if (!dep) return res.status(403).json({ error: 'Sem permissão.' });
      }
      if (!['concluido', 'CONCLUIDO'].includes(fila.status)) {
        return res.status(400).json({ error: 'Apenas consultas concluídas podem ser avaliadas.' });
      }
      if (fila.avaliacao) return res.status(409).json({ error: 'Esta consulta já foi avaliada.' });
      const avaliacao = await prisma.avaliacao.create({
        data: {
          pacienteId,
          pharmacistId: fila.farmaceuticoId || null,
          filaAgendadaId: id,
          nota: notaNum,
          comentario: comentario?.trim()?.slice(0, 500) || null,
        },
      });
      return res.status(201).json({ success: true, avaliacao });
    }

    if (tipo === 'urgente') {
      const fila = await prisma.filaUrgente.findFirst({
        where: { id },
        include: { avaliacao: true },
      });
      if (!fila) return res.status(404).json({ error: 'Consulta não encontrada.' });
      if (fila.pacienteId !== pacienteId) {
        const dep = await prisma.dependentProfile.findFirst({ where: { id: fila.dependentId ?? '', ownerId: pacienteId } });
        if (!dep) return res.status(403).json({ error: 'Sem permissão.' });
      }
      if (!['concluido', 'CONCLUIDO'].includes(fila.status)) {
        return res.status(400).json({ error: 'Apenas consultas concluídas podem ser avaliadas.' });
      }
      if (fila.avaliacao) return res.status(409).json({ error: 'Esta consulta já foi avaliada.' });
      const avaliacao = await prisma.avaliacao.create({
        data: {
          pacienteId,
          pharmacistId: fila.farmaceuticoId || null,
          filaUrgenteId: id,
          nota: notaNum,
          comentario: comentario?.trim()?.slice(0, 500) || null,
        },
      });
      return res.status(201).json({ success: true, avaliacao });
    }

    return res.status(400).json({ error: 'Tipo inválido. Use appointment, agendada ou urgente.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao registrar avaliação.' });
  }
};

// GET /api/paciente/avaliacao-pendente
// Retorna a consulta concluída mais recente sem avaliação do titular
export const getAvaliacaoPendente = async (req, res) => {
  try {
    const pacienteId = req.user.id;

    // FilaAgendada concluída sem avaliação
    const agendada = await prisma.filaAgendada.findFirst({
      where: { pacienteId, status: 'concluido', avaliacao: null },
      orderBy: { criadoEm: 'desc' },
      select: { id: true, dataHora: true, farmaceutico: { select: { name: true } } },
    });

    if (agendada) {
      return res.json({ id: agendada.id, tipo: 'agendada', dataHora: agendada.dataHora, farmaceutico: agendada.farmaceutico?.name ?? null });
    }

    // FilaUrgente concluída sem avaliação
    const urgente = await prisma.filaUrgente.findFirst({
      where: { pacienteId, status: 'concluido', avaliacao: null },
      orderBy: { criadoEm: 'desc' },
      select: { id: true, criadoEm: true, farmaceutico: { select: { name: true } } },
    });

    if (urgente) {
      return res.json({ id: urgente.id, tipo: 'urgente', dataHora: urgente.criadoEm, farmaceutico: urgente.farmaceutico?.name ?? null });
    }

    // Appointment concluído sem avaliação
    const appt = await prisma.appointment.findFirst({
      where: { patientId: pacienteId, status: 'CONCLUIDO', avaliacao: null },
      orderBy: { dateTime: 'desc' },
      select: { id: true, dateTime: true, pharmacist: { select: { name: true } } },
    });

    if (appt) {
      return res.json({ id: appt.id, tipo: 'appointment', dataHora: appt.dateTime, farmaceutico: appt.pharmacist?.name ?? null });
    }

    return res.json(null);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar avaliação pendente.' });
  }
};

// GET /api/farmaceuticos/:id/avaliacoes
export const getAvaliacoesFarmaceutico = async (req, res) => {
  try {
    const { id } = req.params;

    const avaliacoes = await prisma.avaliacao.findMany({
      where: { pharmacistId: id },
      include: { paciente: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const total = avaliacoes.length;
    const media = total > 0
      ? Math.round((avaliacoes.reduce((s, a) => s + a.nota, 0) / total) * 10) / 10
      : null;

    return res.status(200).json({
      media,
      total,
      avaliacoes: avaliacoes.map((a) => ({
        nota:          a.nota,
        comentario:    a.comentario,
        paciente_nome: a.paciente.name.split(' ')[0],
        createdAt:     a.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
};
