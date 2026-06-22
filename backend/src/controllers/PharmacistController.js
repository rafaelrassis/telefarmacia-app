import { PrismaClient } from '@prisma/client';
import { notifyAdminNewPharmacist } from '../services/emailService.js';

const prisma = new PrismaClient();

export const getPharmacists = async (req, res) => {
  try {
    const { tag, today, online } = req.query;

    let todayFilter = {};
    if (today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      todayFilter = {
        availabilities: { some: { isBooked: false, dateTime: { gte: start, lt: end } } },
      };
    }

    const pharmacists = await prisma.user.findMany({
      where: {
        role: 'FARMACEUTICO',
        pharmacistProfile: {
          isApproved: true,
          ...(tag && { tags: { has: tag } }),
          ...(online === 'true' && { isOnline: true }),
        },
        ...todayFilter,
      },
      include: {
        pharmacistProfile: true,
        weeklySchedule: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { appointmentsAsPharmacist: { where: { status: 'CONCLUIDO' } } } },
        avaliacoesComoFarmaceutico: { select: { nota: true } },
        ...(today === 'true' ? {
          availabilities: {
            where: (() => {
              const s = new Date(); s.setHours(0, 0, 0, 0);
              const e = new Date(s); e.setDate(e.getDate() + 1);
              return { isBooked: false, dateTime: { gte: s, lt: e } };
            })(),
            orderBy: { dateTime: 'asc' },
            take: 1,
          },
        } : {}),
      },
    });

    const result = pharmacists.map((p) => {
      const notas = p.avaliacoesComoFarmaceutico;
      const total = notas.length;
      const avg   = total > 0 ? Math.round((notas.reduce((s, a) => s + a.nota, 0) / total) * 10) / 10 : null;
      const { avaliacoesComoFarmaceutico: _, ...rest } = p;
      return { ...rest, avgNota: avg, totalAvaliacoes: total };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar farmacêuticos.' });
  }
};

export const getPharmacistAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const availabilities = await prisma.availability.findMany({
      where: { pharmacistId: id, isBooked: false, dateTime: { gte: new Date() } },
      orderBy: { dateTime: 'asc' },
    });
    return res.status(200).json(availabilities);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar horários.' });
  }
};

export const generateAvailability = async (req, res) => {
  try {
    const pharmacistId = req.user.id;
    if (req.user.role !== 'FARMACEUTICO') {
      return res.status(403).json({ error: 'Apenas farmacêuticos podem gerar horários.' });
    }

    const { date, startHour, endHour, durationMinutes = 30 } = req.body;
    if (!date || !startHour || !endHour) {
      return res.status(400).json({ error: 'Data, hora de início e hora de fim são obrigatórios.' });
    }

    const userProfile = await prisma.pharmacistProfile.findUnique({ where: { userId: pharmacistId } });
    if (!userProfile?.isApproved) {
      return res.status(403).json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
    }

    const startTime = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`);
    const endTime   = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00`);

    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
      return res.status(400).json({ error: 'Intervalo de horário inválido.' });
    }

    const slots = [];
    let currentTime = startTime;
    const slotMs = (Number(durationMinutes) + 15) * 60000;

    while (currentTime < endTime) {
      slots.push({ pharmacistId, dateTime: new Date(currentTime) });
      currentTime = new Date(currentTime.getTime() + slotMs);
    }

    if (slots.length === 0) {
      return res.status(400).json({ error: 'Nenhum horário gerado com este intervalo.' });
    }

    await prisma.availability.createMany({ data: slots });
    return res.status(201).json({ message: 'Horários gerados com sucesso!', slotsCreated: slots.length });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao gerar disponibilidade.' });
  }
};

export const getOwnSchedule = async (req, res) => {
  try {
    if (req.user.role !== 'FARMACEUTICO') {
      return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
    }
    const slots = await prisma.availability.findMany({
      where: { pharmacistId: req.user.id, dateTime: { gte: new Date() } },
      orderBy: { dateTime: 'asc' },
    });
    return res.status(200).json(slots);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar agenda.' });
  }
};

export const deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await prisma.availability.findUnique({ where: { id } });
    if (!slot) return res.status(404).json({ error: 'Horário não encontrado.' });
    if (slot.pharmacistId !== req.user.id) return res.status(403).json({ error: 'Você não pode excluir horários de outro farmacêutico.' });
    if (slot.isBooked) return res.status(400).json({ error: 'Não é possível excluir um horário já reservado.' });
    await prisma.availability.delete({ where: { id } });
    return res.status(200).json({ message: 'Horário removido com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover horário.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    if (req.user.role !== 'FARMACEUTICO') {
      return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
    }
    const { bio, tags, calendarEmbedUrl } = req.body;
    const updated = await prisma.pharmacistProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(bio !== undefined && { bio: bio.trim() }),
        ...(Array.isArray(tags) && { tags }),
        ...(calendarEmbedUrl !== undefined && { calendarEmbedUrl: calendarEmbedUrl?.trim() || null }),
      },
    });
    return res.status(200).json({ message: 'Perfil atualizado com sucesso.', profile: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
};

export const getWeeklySchedule = async (req, res) => {
  try {
    const pharmacistId = req.user.id;
    const [schedule, profile] = await Promise.all([
      prisma.weeklySchedule.findMany({
        where: { pharmacistId },
        orderBy: { dayOfWeek: 'asc' },
      }),
      prisma.pharmacistProfile.findUnique({
        where: { userId: pharmacistId },
        select: { isOnline: true },
      }),
    ]);
    return res.status(200).json({ schedule, isOnline: profile?.isOnline ?? false });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar agenda semanal.' });
  }
};

export const saveWeeklySchedule = async (req, res) => {
  try {
    const pharmacistId = req.user.id;
    const { schedule, isOnline } = req.body;

    if (!Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ error: 'Agenda inválida.' });
    }

    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: pharmacistId } });
    if (!profile?.isApproved) {
      return res.status(403).json({ error: 'Conta não aprovada pelo administrador.' });
    }

    // Upsert each day of the week
    await Promise.all(
      schedule.map(({ dayOfWeek, startTime, endTime, isActive }) =>
        prisma.weeklySchedule.upsert({
          where: { pharmacistId_dayOfWeek: { pharmacistId, dayOfWeek } },
          update: { startTime, endTime, isActive },
          create: { pharmacistId, dayOfWeek, startTime, endTime, isActive },
        })
      )
    );

    // Update online status
    await prisma.pharmacistProfile.update({
      where: { userId: pharmacistId },
      data: { isOnline: Boolean(isOnline) },
    });

    // Delete unbooked future slots and regenerate from schedule
    await prisma.availability.deleteMany({
      where: { pharmacistId, isBooked: false, dateTime: { gte: new Date() } },
    });

    const activeDays = schedule.filter((d) => d.isActive);
    const slots = [];
    const DAYS_AHEAD = 28;
    const SLOT_MS = 45 * 60 * 1000; // 30 min consultation + 15 min buffer

    for (let d = 0; d < DAYS_AHEAD; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      date.setHours(0, 0, 0, 0);

      const dow = date.getDay();
      const daySchedule = activeDays.find((s) => s.dayOfWeek === dow);
      if (!daySchedule) continue;

      const [sH, sM] = daySchedule.startTime.split(':').map(Number);
      const [eH, eM] = daySchedule.endTime.split(':').map(Number);

      if (sH * 60 + sM >= eH * 60 + eM) continue;

      const start = new Date(date);
      start.setHours(sH, sM, 0, 0);
      const end = new Date(date);
      end.setHours(eH, eM, 0, 0);

      // For today, skip slots that have already passed (+ 1 hour buffer)
      const minTime = d === 0 ? Date.now() + 60 * 60 * 1000 : 0;

      let cur = new Date(start);
      while (cur < end) {
        if (cur.getTime() >= minTime) {
          slots.push({ pharmacistId, dateTime: new Date(cur) });
        }
        cur = new Date(cur.getTime() + SLOT_MS);
      }
    }

    if (slots.length > 0) {
      await prisma.availability.createMany({ data: slots });
    }

    return res.status(200).json({
      message: 'Agenda semanal salva com sucesso!',
      slotsGenerated: slots.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao salvar agenda semanal.' });
  }
};

// ── Disponibilidade online/offline ──────────────────────────────────────────

export const setDisponibilidade = async (req, res) => {
  try {
    const pharmacistId = req.user.id;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'isOnline deve ser true ou false.' });
    }

    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: pharmacistId } });
    if (!profile?.isApproved) {
      return res.status(403).json({ error: 'Conta não aprovada pelo administrador.' });
    }

    if (!isOnline) {
      await prisma.$transaction([
        prisma.pharmacistProfile.update({ where: { userId: pharmacistId }, data: { isOnline: false } }),
        prisma.availability.deleteMany({
          where: { pharmacistId, isBooked: false, dateTime: { gte: new Date() } },
        }),
      ]);
      return res.status(200).json({ success: true, isOnline: false });
    }

    // Gera slots: de agora+45min até às 22h de hoje
    const now   = new Date();
    const start = new Date(now.getTime() + 45 * 60 * 1000);
    const end   = new Date(now);
    end.setHours(22, 0, 0, 0);

    const SLOT_MS = 45 * 60 * 1000;
    const slots = [];
    let cur = new Date(start);
    while (cur < end) {
      slots.push({ pharmacistId, dateTime: new Date(cur) });
      cur = new Date(cur.getTime() + SLOT_MS);
    }

    await prisma.$transaction(async (tx) => {
      await tx.pharmacistProfile.update({ where: { userId: pharmacistId }, data: { isOnline: true } });
      // Remove slots livres anteriores para evitar duplicatas
      await tx.availability.deleteMany({
        where: { pharmacistId, isBooked: false, dateTime: { gte: new Date() } },
      });
      if (slots.length > 0) {
        await tx.availability.createMany({ data: slots });
      }
    });

    return res.status(200).json({ success: true, isOnline: true, slotsGerados: slots.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar disponibilidade.' });
  }
};

// ── Upload de documentos para ativação ──────────────────────────────────────

export const cadastroFarmaceutico = async (req, res) => {
  try {
    const userId = req.user.id;

    const rgFile  = req.files?.foto_rg_cnh?.[0];
    const crfFile = req.files?.foto_crf?.[0];

    if (!rgFile)  return res.status(400).json({ error: 'foto_rg_cnh é obrigatória.' });
    if (!crfFile) return res.status(400).json({ error: 'foto_crf é obrigatória.' });

    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Perfil de farmacêutico não encontrado.' });

    const urlDocIdentidade = `/uploads/${rgFile.filename}`;
    const urlDocCrf        = `/uploads/${crfFile.filename}`;

    await prisma.pharmacistProfile.update({
      where: { userId },
      data: { urlDocIdentidade, urlDocCrf, dataEnvioDoc: new Date() },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Disparo assíncrono — não bloqueia o 201
    notifyAdminNewPharmacist({
      nome:      user.name,
      crfNumber: profile.crfNumber,
      crfUF:     profile.crfUF,
    }).catch(() => {});

    return res.status(201).json({ success: true, status: 'Inativo' });
  } catch (error) {
    console.error('Erro no cadastro de farmacêutico:', error);
    return res.status(500).json({ error: 'Erro ao enviar documentos.' });
  }
};
