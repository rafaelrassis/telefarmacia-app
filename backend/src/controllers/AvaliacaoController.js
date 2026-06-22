import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const avaliarConsulta = async (req, res) => {
  try {
    const { appointment_id, nota, comentario } = req.body;
    const pacienteId = req.user.id;

    const notaNum = parseInt(nota, 10);
    if (!notaNum || notaNum < 1 || notaNum > 5) {
      return res.status(422).json({ error: 'Nota deve ser um inteiro de 1 a 5.' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointment_id },
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
        appointmentId: appointment_id,
        nota: notaNum,
        comentario: comentario?.trim()?.slice(0, 500) || null,
      },
    });

    return res.status(201).json({ success: true, avaliacao });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao registrar avaliação.' });
  }
};

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
        nota:         a.nota,
        comentario:   a.comentario,
        paciente_nome: a.paciente.name.split(' ')[0],
        createdAt:    a.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
};
