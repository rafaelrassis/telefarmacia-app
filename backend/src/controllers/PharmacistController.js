import { PrismaClient } from '@prisma/client';
import { notifyAdminNewPharmacist } from '../services/emailService.js';
import { createReadStream, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const prisma    = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

const MIME_BY_EXT = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

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
        _count: {
          select: {
            filaAgendadaComoFarmaceutico: { where: { status: 'concluido' } },
            filaUrgenteComoFarmaceutico:  { where: { status: 'concluido' } },
          },
        },
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
      const { avaliacoesComoFarmaceutico: _, _count, ...rest } = p;
      const consultasCount = _count.filaAgendadaComoFarmaceutico + _count.filaUrgenteComoFarmaceutico;
      return { ...rest, avgNota: avg, totalAvaliacoes: total, consultasCount };
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
    const now = new Date();

    const [availabilities, bloqueios] = await Promise.all([
      prisma.availability.findMany({
        where: { pharmacistId: id, isBooked: false, dateTime: { gte: now } },
        orderBy: { dateTime: 'asc' },
      }),
      prisma.bloqueioAgenda.findMany({
        where: { pharmacistId: id, dataFim: { gte: now } },
        select: { dataInicio: true, dataFim: true },
      }),
    ]);

    const filtered = availabilities.filter(
      (slot) => !bloqueios.some((b) => slot.dateTime >= b.dataInicio && slot.dateTime <= b.dataFim)
    );

    return res.status(200).json(filtered);
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
    const { bio, tags, chavePix } = req.body;
    const updated = await prisma.pharmacistProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(bio !== undefined && { bio: bio.trim() }),
        ...(Array.isArray(tags) && { tags }),
        ...(chavePix !== undefined && { chavePix: chavePix?.trim() || null }),
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

    // Busca horários da plataforma e bloqueios ativos do farmacêutico de uma vez
    const agora = new Date();
    const limiteHorizon = new Date(agora);
    limiteHorizon.setDate(limiteHorizon.getDate() + DAYS_AHEAD);

    const [sistemaHorarios, bloqueiosAtivos] = await Promise.all([
      prisma.sistemaHorario.findMany({ where: { ativo: true } }),
      prisma.bloqueioAgenda.findMany({
        where: { pharmacistId, dataFim: { gte: agora }, dataInicio: { lte: limiteHorizon } },
        select: { dataInicio: true, dataFim: true },
      }),
    ]);

    const sistemaMap = Object.fromEntries(sistemaHorarios.map((h) => [h.diaSemana, h]));

    for (let d = 0; d < DAYS_AHEAD; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      date.setHours(0, 0, 0, 0);

      const dow = date.getDay();
      const daySchedule = activeDays.find((s) => s.dayOfWeek === dow);
      if (!daySchedule) continue;

      // Intersecção com horário da plataforma
      const sistemaHorario = sistemaMap[dow];
      if (!sistemaHorario) continue;

      const [sH, sM] = daySchedule.startTime.split(':').map(Number);
      const [eH, eM] = daySchedule.endTime.split(':').map(Number);
      const [phH, phM] = sistemaHorario.horaInicio.split(':').map(Number);
      const [pfH, pfM] = sistemaHorario.horaFim.split(':').map(Number);

      // Clipa o horário do farmacêutico dentro do horário da plataforma
      const efStartMin = Math.max(sH * 60 + sM, phH * 60 + phM);
      const efEndMin   = Math.min(eH * 60 + eM, pfH * 60 + pfM);
      if (efStartMin >= efEndMin) continue;

      const start = new Date(date);
      start.setHours(Math.floor(efStartMin / 60), efStartMin % 60, 0, 0);
      const end = new Date(date);
      end.setHours(Math.floor(efEndMin / 60), efEndMin % 60, 0, 0);

      // Para hoje, pula slots que já passaram (+ 1 hora de buffer)
      const minTime = d === 0 ? Date.now() + 60 * 60 * 1000 : 0;

      let cur = new Date(start);
      while (cur < end) {
        if (cur.getTime() >= minTime) {
          // Exclui slots que caem em bloqueio ativo
          const emBloqueio = bloqueiosAtivos.some(
            (b) => cur >= b.dataInicio && cur <= b.dataFim
          );
          if (!emBloqueio) {
            slots.push({ pharmacistId, dateTime: new Date(cur) });
          }
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
    const { isOnline, disponivelUrgencias } = req.body;

    if (typeof isOnline !== 'boolean' && typeof disponivelUrgencias !== 'boolean') {
      return res.status(400).json({ error: 'isOnline ou disponivelUrgencias devem ser fornecidos.' });
    }

    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: pharmacistId } });
    if (!profile?.isApproved) {
      return res.status(403).json({ error: 'Conta não aprovada pelo administrador.' });
    }

    // Toggle de disponibilidade para urgências (independente do isOnline)
    if (typeof disponivelUrgencias === 'boolean' && typeof isOnline !== 'boolean') {
      await prisma.pharmacistProfile.update({
        where: { userId: pharmacistId },
        data: { disponivelUrgencias },
      });
      return res.status(200).json({ success: true, disponivelUrgencias });
    }

    if (!isOnline) {
      await prisma.pharmacistProfile.update({
        where: { userId: pharmacistId },
        data: {
          isOnline: false,
          ...(typeof disponivelUrgencias === 'boolean' && { disponivelUrgencias }),
        },
      });
      return res.status(200).json({ success: true, isOnline: false });
    }

    await prisma.pharmacistProfile.update({ where: { userId: pharmacistId }, data: { isOnline: true } });

    return res.status(200).json({ success: true, isOnline: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar disponibilidade.' });
  }
};

// ── GET /api/farmaceutico/calendario ────────────────────────────────────────
// Retorna consultas de fila aceitas pelo farmacêutico logado

export const getCalendario = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') {
    return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
  }
  const pharmacistId = req.user.id;

  try {
    const [agendadas, urgentes] = await Promise.all([
      prisma.filaAgendada.findMany({
        where: { farmaceuticoId: pharmacistId, status: { in: ['aceito', 'em_atendimento'] } },
        include: { paciente: { select: { name: true } } },
        orderBy: { dataHora: 'asc' },
      }),
      prisma.filaUrgente.findMany({
        where: { farmaceuticoId: pharmacistId, status: { in: ['aceito', 'em_atendimento'] } },
        include: { paciente: { select: { name: true } } },
        orderBy: { criadoEm: 'asc' },
      }),
    ]);

    const events = [
      ...agendadas.map((f) => ({
        id:            f.id,
        tipo:          'agendada',
        paciente_nome: f.paciente?.name ?? 'Paciente',
        data_hora:     f.dataHora,
        status:        f.status,
      })),
      ...urgentes.map((f) => ({
        id:            f.id,
        tipo:          'urgente',
        paciente_nome: f.paciente?.name ?? 'Paciente',
        data_hora:     f.aceitoEm ?? f.criadoEm,
        status:        f.status,
      })),
    ];

    return res.status(200).json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar calendário.' });
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
      email:     user.email,
      phone:     user.phone,
      bio:       profile.bio,
      tags:      profile.tags,
    }).catch(() => {});

    return res.status(201).json({ success: true, status: 'Inativo' });
  } catch (error) {
    console.error('Erro no cadastro de farmacêutico:', error);
    return res.status(500).json({ error: 'Erro ao enviar documentos.' });
  }
};

// ── GET /api/farmaceutico/consultas (filtros + paginação) ────────────────────

export const getConsultasFarmaceutico = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const pharmacistId = req.user.id;
  const { de, ate, status, page = '1', limit = '10' } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;

  try {
    const [agendadas, urgentes] = await Promise.all([
      prisma.filaAgendada.findMany({
        where: { farmaceuticoId: pharmacistId },
        include: { paciente: { select: { name: true } } },
        orderBy: { dataHora: 'desc' },
      }),
      prisma.filaUrgente.findMany({
        where: { farmaceuticoId: pharmacistId },
        include: { paciente: { select: { name: true } } },
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    let normalized = [
      ...agendadas.map((f) => ({
        id:              f.id,
        tipo:            'agendada',
        dataHora:        f.dataHora,
        criadoEm:        f.criadoEm,
        status:          f.status,
        patient:         { name: f.paciente?.name ?? '—', pacienteProfile: null },
        recommendations: null,
        avaliacao:       null,
        creditoDebitado: Number(f.creditoDebitado),
      })),
      ...urgentes.map((f) => ({
        id:              f.id,
        tipo:            'urgente',
        dataHora:        f.criadoEm,
        criadoEm:        f.criadoEm,
        status:          f.status,
        patient:         { name: f.paciente?.name ?? '—', pacienteProfile: null },
        recommendations: null,
        avaliacao:       null,
        creditoDebitado: Number(f.creditoDebitado),
      })),
    ].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

    if (de) {
      const deDate = new Date(`${de}T00:00:00-03:00`);
      normalized = normalized.filter((a) => new Date(a.dataHora) >= deDate);
    }
    if (ate) {
      const ateDate = new Date(`${ate}T23:59:59-03:00`);
      normalized = normalized.filter((a) => new Date(a.dataHora) <= ateDate);
    }
    if (status) {
      if (status === 'expirado') {
        normalized = normalized.filter((a) => a.status === 'expirado' || a.status === 'EXPIRADA');
      } else {
        normalized = normalized.filter((a) => a.status.toLowerCase() === status.toLowerCase());
      }
    }

    const total = normalized.length;
    const items = normalized.slice(skip, skip + limitNum);

    return res.status(200).json({
      items,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore:    skip + limitNum < total,
    });
  } catch (err) {
    console.error('getConsultasFarmaceutico error:', err);
    return res.status(500).json({ error: 'Erro ao buscar consultas.' });
  }
};

// ── GET /api/farmaceutico/ganhos?de=&ate=&page= ──────────────────────────────

export const getGanhosFarmaceutico = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const pharmacistId = req.user.id;
  const pageNum  = Math.max(1, parseInt(req.query.page ?? '1'));
  const limitNum = 10;
  const skip     = (pageNum - 1) * limitNum;

  // Resolve de/ate — default: mês atual em horário de Brasília
  const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const yyyy  = nowBR.getFullYear();
  const mm    = String(nowBR.getMonth() + 1).padStart(2, '0');
  const dd    = String(nowBR.getDate()).padStart(2, '0');
  const de    = req.query.de  || `${yyyy}-${mm}-01`;
  const ate   = req.query.ate || `${yyyy}-${mm}-${dd}`;

  const deDate  = new Date(`${de}T00:00:00-03:00`);
  const ateDate = new Date(`${ate}T23:59:59-03:00`);

  // Período anterior (mesma duração, imediatamente antes)
  const durationMs  = ateDate.getTime() - deDate.getTime() + 1000;
  const prevAteDate = new Date(deDate.getTime() - 1000);
  const prevDeDate  = new Date(prevAteDate.getTime() - durationMs + 1000);

  try {
    const [agendadas, urgentes, prevAg, prevUr, comissaoRow, comissaoInd] = await Promise.all([
      prisma.filaAgendada.findMany({
        where: { farmaceuticoId: pharmacistId, status: 'concluido', dataHora: { gte: deDate, lte: ateDate } },
        include: { paciente: { select: { name: true } } },
        orderBy: { dataHora: 'desc' },
      }),
      prisma.filaUrgente.findMany({
        where: { farmaceuticoId: pharmacistId, status: 'concluido', criadoEm: { gte: deDate, lte: ateDate } },
        include: { paciente: { select: { name: true } } },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.filaAgendada.findMany({
        where: { farmaceuticoId: pharmacistId, status: 'concluido', dataHora: { gte: prevDeDate, lte: prevAteDate } },
        select: { creditoDebitado: true },
      }),
      prisma.filaUrgente.findMany({
        where: { farmaceuticoId: pharmacistId, status: 'concluido', criadoEm: { gte: prevDeDate, lte: prevAteDate } },
        select: { creditoDebitado: true },
      }),
      prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
      prisma.$queryRawUnsafe(
        `SELECT CAST(percentual AS FLOAT) AS percentual FROM comissoes_individuais WHERE farmaceutico_id = $1`,
        pharmacistId
      ).catch(() => []),
    ]);

    const comissaoPadrao  = parseFloat(comissaoRow?.value ?? '70');
    const percentual      = comissaoInd[0]?.percentual ?? comissaoPadrao;

    // Normaliza período atual com ganho líquido por item
    const allItems = [
      ...agendadas.map((f) => {
        const valor = Number(f.creditoDebitado);
        return { id: f.id, tipo: 'agendada', data: f.dataHora, paciente: f.paciente?.name ?? '—', valor, ganho: Math.round(valor * (percentual / 100) * 100) / 100 };
      }),
      ...urgentes.map((f) => {
        const valor = Number(f.creditoDebitado);
        return { id: f.id, tipo: 'urgente', data: f.criadoEm, paciente: f.paciente?.name ?? '—', valor, ganho: Math.round(valor * (percentual / 100) * 100) / 100 };
      }),
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    // Comissão gravada no momento da conclusão (por consulta) — quando ausente
    // (consultas concluídas antes desta coluna existir), usa a taxa atual e marca "estimado"
    if (allItems.length > 0) {
      const agIds = agendadas.map((f) => f.id);
      const urIds = urgentes.map((f) => f.id);
      const [comAg, comUr] = await Promise.all([
        agIds.length ? prisma.$queryRawUnsafe(`SELECT id, comissao_percentual FROM "FilaAgendada" WHERE id = ANY($1::text[])`, agIds).catch(() => []) : [],
        urIds.length ? prisma.$queryRawUnsafe(`SELECT id, comissao_percentual FROM "FilaUrgente" WHERE id = ANY($1::text[])`, urIds).catch(() => []) : [],
      ]);
      const comissaoStoredMap = {};
      for (const r of [...comAg, ...comUr]) {
        if (r.comissao_percentual != null) comissaoStoredMap[r.id] = Number(r.comissao_percentual);
      }
      for (const item of allItems) {
        const stored = comissaoStoredMap[item.id];
        item.comissaoPercentual = stored ?? percentual;
        item.estimado           = stored == null;
        item.ganho              = Math.round(item.valor * (item.comissaoPercentual / 100) * 100) / 100;
      }
    }

    // Marca status de repasse por item (repassado / a receber)
    if (allItems.length > 0) {
      const allIds = allItems.map((i) => i.id);
      const repasseRows = await prisma.$queryRawUnsafe(
        `SELECT ri."consultaId", ri."consultaTipo", r."criadoEm" AS "repassadoEm"
         FROM "RepasseItem" ri
         JOIN "Repasse" r ON r.id = ri."repasseId"
         WHERE ri."consultaId" = ANY($1::text[])`,
        allIds
      ).catch(() => []);
      const repasseMap = {};
      for (const ri of repasseRows) {
        repasseMap[`${ri.consultaId}-${ri.consultaTipo}`] = ri.repassadoEm;
      }
      for (const item of allItems) {
        const key = `${item.id}-${item.tipo}`;
        item.repassado   = key in repasseMap;
        item.repassadoEm = repasseMap[key] ?? null;
      }
    }

    // Totalizadores globais (independentes do período filtrado)
    const [aReceberRows, repassadoMesRows, totalAnoRows] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(fa."creditoDebitado"), 0)::float AS total FROM "FilaAgendada" fa
         LEFT JOIN "RepasseItem" ri ON ri."consultaId" = fa.id AND ri."consultaTipo" = 'agendada'
         WHERE fa."farmaceuticoId" = $1 AND fa.status = 'concluido' AND ri.id IS NULL
         UNION ALL
         SELECT COALESCE(SUM(fu."creditoDebitado"), 0)::float AS total FROM "FilaUrgente" fu
         LEFT JOIN "RepasseItem" ri ON ri."consultaId" = fu.id AND ri."consultaTipo" = 'urgente'
         WHERE fu."farmaceuticoId" = $1 AND fu.status = 'concluido' AND ri.id IS NULL`,
        pharmacistId
      ).catch(() => [{ total: 0 }, { total: 0 }]),
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(ri."valorLiquido"), 0)::float AS total
         FROM "RepasseItem" ri JOIN "Repasse" r ON r.id = ri."repasseId"
         WHERE r."pharmacistId" = $1
           AND DATE_TRUNC('month', r."criadoEm") = DATE_TRUNC('month', NOW())`,
        pharmacistId
      ).catch(() => [{ total: 0 }]),
      prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(fa."creditoDebitado"), 0)::float AS total FROM "FilaAgendada" fa
         WHERE fa."farmaceuticoId" = $1 AND fa.status = 'concluido'
           AND EXTRACT(YEAR FROM fa."dataHora") = EXTRACT(YEAR FROM NOW())
         UNION ALL
         SELECT COALESCE(SUM(fu."creditoDebitado"), 0)::float AS total FROM "FilaUrgente" fu
         WHERE fu."farmaceuticoId" = $1 AND fu.status = 'concluido'
           AND EXTRACT(YEAR FROM fu."criadoEm") = EXTRACT(YEAR FROM NOW())`,
        pharmacistId
      ).catch(() => [{ total: 0 }, { total: 0 }]),
    ]);

    const aReceberBruto = Number(aReceberRows[0]?.total ?? 0) + Number(aReceberRows[1]?.total ?? 0);
    const aReceber      = Math.round(aReceberBruto * (percentual / 100) * 100) / 100;
    const repassadoMes  = Math.round(Number(repassadoMesRows[0]?.total ?? 0) * 100) / 100;
    const totalAnoBruto = Number(totalAnoRows[0]?.total ?? 0) + Number(totalAnoRows[1]?.total ?? 0);
    const totalAno      = Math.round(totalAnoBruto * (percentual / 100) * 100) / 100;

    // Métricas — totalRecebido é o líquido (após comissão)
    const totalBruto          = allItems.reduce((s, i) => s + i.valor, 0);
    const totalRecebido       = allItems.reduce((s, i) => s + i.ganho, 0);
    const consultasConcluidas = allItems.length;
    const ticketMedio         = consultasConcluidas > 0 ? totalRecebido / consultasConcluidas : 0;
    const prevBruto           = [...prevAg, ...prevUr].reduce((s, i) => s + Number(i.creditoDebitado), 0);
    const prevTotal           = Math.round(prevBruto * (percentual / 100) * 100) / 100;
    const comparativo         = prevTotal > 0
      ? ((totalRecebido - prevTotal) / prevTotal) * 100
      : totalRecebido > 0 ? 100 : 0;

    // Gráfico: agrupa ganho por dia em BRT
    const dayMap = {};
    for (const item of allItems) {
      const brt = new Date(new Date(item.data).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const key = `${brt.getFullYear()}-${String(brt.getMonth()+1).padStart(2,'0')}-${String(brt.getDate()).padStart(2,'0')}`;
      dayMap[key] = (dayMap[key] ?? 0) + item.ganho;
    }
    const grafico = [];
    const [deY, deM, deD]   = de.split('-').map(Number);
    const [ateY, ateM, ateD] = ate.split('-').map(Number);
    for (let d = new Date(deY, deM - 1, deD); d <= new Date(ateY, ateM - 1, ateD); d.setDate(d.getDate() + 1)) {
      const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      grafico.push({ data: key, label, total: dayMap[key] ?? 0 });
    }

    return res.status(200).json({
      metricas: {
        totalRecebido:        Math.round(totalRecebido * 100) / 100,
        totalBruto:           Math.round(totalBruto * 100) / 100,
        percentualComissao:   percentual,
        consultasConcluidas,
        ticketMedio:          Math.round(ticketMedio * 100) / 100,
        comparativo:          Math.round(comparativo * 10) / 10,
        prevTotal:            Math.round(prevTotal * 100) / 100,
        aReceber,
        repassadoMes,
        totalAno,
      },
      grafico,
      lista: {
        items:   allItems.slice(skip, skip + limitNum),
        total:   allItems.length,
        page:    pageNum,
        hasMore: skip + limitNum < allItems.length,
      },
    });
  } catch (err) {
    console.error('getGanhosFarmaceutico error:', err);
    return res.status(500).json({ error: 'Erro ao buscar ganhos.' });
  }
};

// ── GET /api/farmaceutico/ganhos/export?de=&ate= ─────────────────────────────

export const exportGanhosFarmaceutico = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const pharmacistId = req.user.id;

  const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const yyyy  = nowBR.getFullYear();
  const mm    = String(nowBR.getMonth() + 1).padStart(2, '0');
  const dd    = String(nowBR.getDate()).padStart(2, '0');
  const de    = req.query.de  || `${yyyy}-${mm}-01`;
  const ate   = req.query.ate || `${yyyy}-${mm}-${dd}`;

  const deDate  = new Date(`${de}T00:00:00-03:00`);
  const ateDate = new Date(`${ate}T23:59:59-03:00`);

  try {
    const [agendadas, urgentes, comissaoRow, comissaoInd] = await Promise.all([
      prisma.filaAgendada.findMany({
        where:   { farmaceuticoId: pharmacistId, status: 'concluido', dataHora: { gte: deDate, lte: ateDate } },
        include: { paciente: { select: { name: true } } },
        orderBy: { dataHora: 'desc' },
      }),
      prisma.filaUrgente.findMany({
        where:   { farmaceuticoId: pharmacistId, status: 'concluido', criadoEm: { gte: deDate, lte: ateDate } },
        include: { paciente: { select: { name: true } } },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
      prisma.$queryRawUnsafe(
        `SELECT CAST(percentual AS FLOAT) AS percentual FROM comissoes_individuais WHERE farmaceutico_id = $1`,
        pharmacistId
      ).catch(() => []),
    ]);

    const percentualAtual = comissaoInd[0]?.percentual ?? parseFloat(comissaoRow?.value ?? '70');

    const allItems = [
      ...agendadas.map((f) => ({ id: f.id, tipo: 'agendada', data: f.dataHora, paciente: f.paciente?.name ?? '—', valor: Number(f.creditoDebitado) })),
      ...urgentes.map((f)  => ({ id: f.id, tipo: 'urgente',  data: f.criadoEm,  paciente: f.paciente?.name ?? '—', valor: Number(f.creditoDebitado) })),
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    if (allItems.length > 0) {
      const agIds = agendadas.map((f) => f.id);
      const urIds = urgentes.map((f) => f.id);
      const [comAg, comUr, repasseRows] = await Promise.all([
        agIds.length ? prisma.$queryRawUnsafe(`SELECT id, comissao_percentual FROM "FilaAgendada" WHERE id = ANY($1::text[])`, agIds).catch(() => []) : [],
        urIds.length ? prisma.$queryRawUnsafe(`SELECT id, comissao_percentual FROM "FilaUrgente" WHERE id = ANY($1::text[])`, urIds).catch(() => []) : [],
        prisma.$queryRawUnsafe(
          `SELECT ri."consultaId", ri."consultaTipo", r."criadoEm" AS "repassadoEm"
           FROM "RepasseItem" ri JOIN "Repasse" r ON r.id = ri."repasseId"
           WHERE ri."consultaId" = ANY($1::text[])`,
          allItems.map((i) => i.id)
        ).catch(() => []),
      ]);
      const comissaoStoredMap = {};
      for (const r of [...comAg, ...comUr]) {
        if (r.comissao_percentual != null) comissaoStoredMap[r.id] = Number(r.comissao_percentual);
      }
      const repasseMap = {};
      for (const ri of repasseRows) repasseMap[`${ri.consultaId}-${ri.consultaTipo}`] = ri.repassadoEm;

      for (const item of allItems) {
        const pct = comissaoStoredMap[item.id] ?? percentualAtual;
        item.comissaoPercentual = pct;
        item.ganho     = Math.round(item.valor * (pct / 100) * 100) / 100;
        const key      = `${item.id}-${item.tipo}`;
        item.repassado = key in repasseMap;
        item.repassadoEm = repasseMap[key] ?? null;
      }
    }

    const fmtDec = (n) => Number(n).toFixed(2).replace('.', ',');
    const header = 'Data;Paciente;Tipo;Valor cobrado;Comissão %;Valor líquido;Status;Data repasse\n';
    const csvRows = allItems.map((i) => {
      const dt = new Date(i.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const dtRepasse = i.repassadoEm ? new Date(i.repassadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
      return [
        `"${dt}"`, `"${i.paciente}"`, `"${i.tipo === 'agendada' ? 'Agendada' : 'Urgente'}"`,
        fmtDec(i.valor), fmtDec(i.comissaoPercentual), fmtDec(i.ganho),
        `"${i.repassado ? 'Repassado' : 'A receber'}"`, `"${dtRepasse}"`,
      ].join(';');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ganhos-${de}_a_${ate}.csv"`);
    return res.send('﻿' + header + csvRows.join('\n'));
  } catch (err) {
    console.error('exportGanhosFarmaceutico error:', err);
    return res.status(500).json({ error: 'Erro ao exportar ganhos.' });
  }
};

// ── GET /api/farmaceutico/urgentes-aceitas ────────────────────────────────────

export const getUrgentesAceitas = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const pharmacistId = req.user.id;
  try {
    const items = await prisma.filaUrgente.findMany({
      where:   { farmaceuticoId: pharmacistId, status: { in: ['aceito', 'em_atendimento'] } },
      include: { paciente: { select: { name: true } } },
      orderBy: { criadoEm: 'desc' },
    });
    return res.status(200).json(
      items.map((f) => ({
        id:           f.id,
        pacienteNome: f.paciente?.name ?? 'Paciente',
        criadoEm:     f.criadoEm,
        status:       f.status,
      }))
    );
  } catch (err) {
    console.error('getUrgentesAceitas error:', err);
    return res.status(500).json({ error: 'Erro ao buscar urgentes aceitas.' });
  }
};

// ── GET /uploads/:filename (autenticado — documentos de identidade/CRF) ─────
// Serve foto_rg_cnh/foto_crf apenas para o próprio farmacêutico dono ou admin.
// Padrão do multerConfig: `${userId}_${fieldname}_${timestamp}.ext`.

export const DOC_IDENTIDADE_REGEX = /^([0-9a-f-]{36})_(foto_rg_cnh|foto_crf)_\d+(\.[a-z0-9]+)$/i;

export const getDocumentoIdentidade = async (req, res) => {
  const { filename } = req.params;
  const match = DOC_IDENTIDADE_REGEX.exec(filename);
  if (!match) return res.status(404).json({ error: 'Arquivo não encontrado.' });
  const [, ownerId] = match;

  // Checagem de admin ao vivo via ADMIN_EMAILS (mesmo critério do adminMiddleware),
  // em vez de confiar na claim isAdmin do JWT, que pode ficar desatualizada por até 7 dias.
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
  const isAdmin = adminEmails.includes(req.user.email);

  if (req.user.id !== ownerId && !isAdmin) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../../uploads');
  const filepath   = join(UPLOAD_DIR, filename);
  if (!existsSync(filepath)) return res.status(404).json({ error: 'Arquivo não encontrado.' });

  res.setHeader('Content-Type', MIME_BY_EXT[extname(filename).toLowerCase()] || 'application/octet-stream');
  createReadStream(filepath).pipe(res);
};
