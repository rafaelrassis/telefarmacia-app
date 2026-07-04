import { PrismaClient } from '@prisma/client';
import { PRECO_PADRAO } from './PagamentoController.js';

const prisma = new PrismaClient();

// ── Existentes (mantidos para compatibilidade) ───────────────────────────────

export const createAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { availabilityId, pharmacistId } = req.body;

    const appointment = await prisma.$transaction(async (tx) => {
      const slot = await tx.availability.findUnique({ where: { id: availabilityId } });
      if (!slot || slot.isBooked) throw new Error('Horário indisponível.');

      await tx.availability.update({ where: { id: availabilityId }, data: { isBooked: true } });

      return await tx.appointment.create({
        data: { patientId, pharmacistId, dateTime: slot.dateTime, durationMinutes: 30, status: 'PENDENTE_PAGAMENTO' },
      });
    });

    return res.status(201).json({ message: 'Agendamento reservado!', appointment });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Erro ao criar agendamento.' });
  }
};

export const getAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { role } = req.user;
    const whereClause = role === 'PACIENTE' ? { patientId: userId } : { pharmacistId: userId };

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: { include: { pacienteProfile: true } },
        pharmacist: true,
        avaliacao: { select: { nota: true, comentario: true, createdAt: true } },
      },
      orderBy: { dateTime: 'desc' },
    });

    return res.status(200).json(appointments);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
};

export const confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    if (appointment.status !== 'PENDENTE_PAGAMENTO') {
      return res.status(400).json({ error: 'Este agendamento já foi processado.' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'AGENDADO' },
    });

    return res.status(200).json({ message: 'Agendamento confirmado!', appointment: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao confirmar agendamento.' });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { include: { pacienteProfile: true } }, pharmacist: true },
    });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    if (appointment.patientId !== userId && appointment.pharmacistId !== userId) {
      return res.status(403).json({ error: 'Sem permissão.' });
    }
    return res.status(200).json(appointment);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar agendamento.' });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    const isPatient = appointment.patientId === userId;
    const isPharmacist = appointment.pharmacistId === userId;
    if (!isPatient && !isPharmacist) {
      return res.status(403).json({ error: 'Sem permissão para cancelar este agendamento.' });
    }
    if (!['AGENDADO', 'PENDENTE_PAGAMENTO'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Apenas consultas pendentes ou agendadas podem ser canceladas.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id }, data: { status: 'CANCELADO' } });
      await tx.availability.updateMany({
        where: { pharmacistId: appointment.pharmacistId, dateTime: appointment.dateTime, isBooked: true },
        data: { isBooked: false },
      });

      // Reembolso automático de créditos se o agendamento estava AGENDADO (pago via carteira)
      if (appointment.status === 'AGENDADO') {
        const carteira = await tx.carteira.findUnique({ where: { pacienteId: appointment.patientId } });
        if (carteira) {
          const profile = await tx.pharmacistProfile.findUnique({ where: { userId: appointment.pharmacistId } });
          const preco = parseFloat(profile?.precoConsulta ?? PRECO_PADRAO);
          await tx.carteira.update({
            where: { pacienteId: appointment.patientId },
            data: { saldo: { increment: preco } },
          });
        }
      }
    });

    return res.status(200).json({ message: 'Consulta cancelada com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao cancelar consulta.' });
  }
};

export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { recommendations } = req.body;
    const userId = req.user.id;

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    if (appointment.pharmacistId !== userId) {
      return res.status(403).json({ error: 'Apenas o farmacêutico responsável pode encerrar esta consulta.' });
    }
    if (appointment.status !== 'AGENDADO') {
      return res.status(400).json({ error: 'Só é possível encerrar consultas com status AGENDADO.' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONCLUIDO', recommendations: recommendations?.trim() || null },
    });

    return res.status(200).json({ message: 'Consulta encerrada com sucesso.', appointment: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao encerrar consulta.' });
  }
};

// ── Novos endpoints v2 ────────────────────────────────────────────────────────

export const getDisponiveis = async (req, res) => {
  try {
    const { data, farmaceutico } = req.query;

    const where = { isBooked: false };

    if (data) {
      const day = new Date(data);
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end   = new Date(day); end.setHours(23, 59, 59, 999);
      where.dateTime = { gte: start, lte: end };
    } else {
      where.dateTime = { gte: new Date() };
    }

    if (farmaceutico) where.pharmacistId = farmaceutico;

    const slots = await prisma.availability.findMany({
      where,
      include: {
        pharmacist: {
          select: {
            id: true, name: true,
            pharmacistProfile: { select: { crfNumber: true, crfUF: true } },
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });

    return res.status(200).json(
      slots.map((s) => ({
        id_slot:   s.id,
        data_hora: s.dateTime,
        farmaceutico: {
          id:   s.pharmacistId,
          nome: s.pharmacist.name,
          crf:  s.pharmacist.pharmacistProfile
            ? `${s.pharmacist.pharmacistProfile.crfNumber}/${s.pharmacist.pharmacistProfile.crfUF}`
            : null,
        },
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar slots disponíveis.' });
  }
};

export const reservarSlot = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id_slot } = req.body;

    if (!id_slot) return res.status(400).json({ error: 'id_slot é obrigatório.' });

    // Verifica se o sistema está aberto para agendamentos
    const sysConfig = await prisma.systemConfig.findUnique({ where: { key: 'sistema_aberto' } });
    if (sysConfig?.value !== 'true') {
      return res.status(503).json({ error: 'O sistema de agendamentos está temporariamente fechado.' });
    }

    const slot = await prisma.availability.findUnique({
      where: { id: id_slot },
      include: { pharmacist: { include: { pharmacistProfile: true } } },
    });
    if (!slot || slot.isBooked) return res.status(400).json({ error: 'Horário indisponível.' });

    // Verifica bloqueio de agenda do farmacêutico neste horário
    const bloqueioAtivo = await prisma.bloqueioAgenda.findFirst({
      where: {
        pharmacistId: slot.pharmacistId,
        dataInicio: { lte: slot.dateTime },
        dataFim:    { gte: slot.dateTime },
      },
    });
    if (bloqueioAtivo) {
      return res.status(400).json({ error: 'O farmacêutico está indisponível neste horário. Por favor escolha outro.' });
    }

    const preco = parseFloat(slot.pharmacist?.pharmacistProfile?.precoConsulta ?? PRECO_PADRAO);

    // Verifica saldo
    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: patientId } });
    const saldo = carteira ? parseFloat(carteira.saldo) : 0;
    if (saldo < preco) {
      return res.status(402).json({
        error: 'Saldo insuficiente.',
        saldo_atual: saldo,
        valor_necessario: preco,
      });
    }

    const consulta = await prisma.$transaction(async (tx) => {
      // Re-verifica slot dentro da transação (anti double-booking)
      const slotFresh = await tx.availability.findUnique({ where: { id: id_slot } });
      if (!slotFresh || slotFresh.isBooked) throw new Error('Horário indisponível.');

      await tx.carteira.update({
        where: { pacienteId: patientId },
        data: { saldo: { decrement: preco } },
      });

      await tx.availability.update({ where: { id: id_slot }, data: { isBooked: true } });

      return tx.appointment.create({
        data: {
          patientId,
          pharmacistId: slot.pharmacistId,
          dateTime: slot.dateTime,
          durationMinutes: 30,
          status: 'AGENDADO',
        },
      });
    });

    return res.status(201).json({ success: true, consulta_id: consulta.id, status: 'Agendada' });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Horário indisponível.' });
  }
};

// Helper compartilhado para debitar e criar o agendamento
async function _bookSlot(tx, patientId, slot, preco) {
  const slotFresh = await tx.availability.findUnique({ where: { id: slot.id } });
  if (!slotFresh || slotFresh.isBooked) throw new Error('Horário ficou indisponível. Tente novamente.');
  await tx.carteira.update({ where: { pacienteId: patientId }, data: { saldo: { decrement: preco } } });
  await tx.availability.update({ where: { id: slot.id }, data: { isBooked: true } });
  return tx.appointment.create({
    data: { patientId, pharmacistId: slot.pharmacistId, dateTime: slot.dateTime, durationMinutes: 30, status: 'AGENDADO' },
  });
}

export const agendarProximo = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { data_hora } = req.body; // opcional: filtra por horário específico

    const sysConfig = await prisma.systemConfig.findUnique({ where: { key: 'sistema_aberto' } });
    if (sysConfig && sysConfig.value !== 'true') {
      return res.status(503).json({ error: 'O sistema de agendamentos está temporariamente fechado.' });
    }

    const dateFilter = data_hora
      ? { equals: new Date(data_hora) }
      : { gte: new Date() };

    const slot = await prisma.availability.findFirst({
      where: {
        isBooked: false,
        dateTime: dateFilter,
        pharmacist: { pharmacistProfile: { isApproved: true } },
      },
      orderBy: { dateTime: 'asc' },
      include: { pharmacist: { include: { pharmacistProfile: true } } },
    });

    if (!slot) {
      return res.status(404).json({
        error: data_hora
          ? 'Nenhum farmacêutico disponível neste horário. Escolha outro.'
          : 'Nenhum farmacêutico disponível no momento. Tente novamente mais tarde.',
      });
    }

    const preco = parseFloat(slot.pharmacist?.pharmacistProfile?.precoConsulta ?? PRECO_PADRAO);
    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: patientId } });
    const saldo = carteira ? parseFloat(carteira.saldo) : 0;
    if (saldo < preco) {
      return res.status(402).json({ error: 'Saldo insuficiente.', saldo_atual: saldo, valor_necessario: preco });
    }

    const consulta = await prisma.$transaction((tx) => _bookSlot(tx, patientId, slot, preco));

    return res.status(201).json({
      success: true,
      consulta_id: consulta.id,
      farmaceutico: slot.pharmacist.name,
      data_hora: slot.dateTime,
      preco_cobrado: preco,
      status: 'Agendada',
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Erro ao agendar.' });
  }
};

export const proximoDisponivel = async (req, res) => {
  try {
    const patientId = req.user.id;

    const sysConfig = await prisma.systemConfig.findUnique({ where: { key: 'sistema_aberto' } });
    if (sysConfig && sysConfig.value !== 'true') {
      return res.status(200).json({ disponivel: false, mensagem: 'O sistema de agendamentos está temporariamente fechado.' });
    }

    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const slot = await prisma.availability.findFirst({
      where: {
        isBooked: false,
        dateTime: { gte: now, lte: endOfToday },
        pharmacist: { pharmacistProfile: { isApproved: true } },
      },
      orderBy: { dateTime: 'asc' },
      include: { pharmacist: { include: { pharmacistProfile: true } } },
    });

    if (!slot) {
      return res.status(200).json({
        disponivel: false,
        mensagem: 'Nenhum farmacêutico disponível no momento. Tente agendar um horário.',
      });
    }

    const preco = parseFloat(slot.pharmacist?.pharmacistProfile?.precoConsulta ?? PRECO_PADRAO);
    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: patientId } });
    const saldo = carteira ? parseFloat(carteira.saldo) : 0;
    if (saldo < preco) {
      return res.status(402).json({ error: 'Saldo insuficiente.', saldo_atual: saldo, valor_necessario: preco });
    }

    const consulta = await prisma.$transaction((tx) => _bookSlot(tx, patientId, slot, preco));

    return res.status(200).json({
      disponivel: true,
      success: true,
      consulta_id: consulta.id,
      farmaceutico: slot.pharmacist.name,
      data_hora: slot.dateTime,
      preco_cobrado: preco,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Erro ao agendar.' });
  }
};

export const atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const MAP = { Finalizada: 'CONCLUIDO', Cancelada: 'CANCELADO' };
    const newStatus = MAP[status];
    if (!newStatus) return res.status(400).json({ error: 'Transição de status inválida.' });

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ error: 'Consulta não encontrada.' });

    if (newStatus === 'CONCLUIDO') {
      if (appointment.pharmacistId !== userId) {
        return res.status(403).json({ error: 'Sem permissão para finalizar esta consulta.' });
      }
      if (appointment.status !== 'AGENDADO') {
        return res.status(400).json({ error: 'Transição de status inválida.' });
      }
    }

    if (newStatus === 'CANCELADO') {
      if (appointment.patientId !== userId && appointment.pharmacistId !== userId) {
        return res.status(403).json({ error: 'Sem permissão para alterar este status.' });
      }
      if (!['AGENDADO', 'PENDENTE_PAGAMENTO'].includes(appointment.status)) {
        return res.status(400).json({ error: 'Transição de status inválida.' });
      }
    }

    await prisma.appointment.update({ where: { id }, data: { status: newStatus } });
    return res.status(200).json({ message: 'Status atualizado com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
};
