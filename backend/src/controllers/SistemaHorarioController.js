import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function nowInBR() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function timeStr(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ── GET /api/admin/horarios ──────────────────────────────────────────────────

export const getHorarios = async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache');
  try {
    const horarios = await prisma.sistemaHorario.findMany({ orderBy: { diaSemana: 'asc' } });
    return res.status(200).json(horarios);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar horários.' });
  }
};

// ── PUT /api/admin/horarios ──────────────────────────────────────────────────
// Body: { horarios: [{ diaSemana, horaInicio, horaFim, ativo }, ...] }

export const saveHorarios = async (req, res) => {
  const { horarios } = req.body;
  if (!Array.isArray(horarios)) {
    return res.status(400).json({ error: 'Envie { horarios: [...] }.' });
  }

  try {
    const results = await Promise.all(
      horarios.map((h) =>
        prisma.sistemaHorario.upsert({
          where:  { diaSemana: h.diaSemana },
          update: { horaInicio: h.horaInicio, horaFim: h.horaFim, ativo: h.ativo },
          create: { diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFim: h.horaFim, ativo: h.ativo },
        })
      )
    );
    const now = new Date().toISOString();
    await prisma.systemConfig.upsert({
      where:  { key: 'ultima_atualizacao' },
      update: { value: now },
      create: { key: 'ultima_atualizacao', value: now },
    });
    return res.status(200).json({ salvo: true, ultima_atualizacao: now, horarios: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar horários.' });
  }
};

// ── GET /api/sistema/aberto ──────────────────────────────────────────────────

const DIAS_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

async function getProximaAbertura(currentDow) {
  try {
    const ativos = await prisma.sistemaHorario.findMany({ where: { ativo: true } });
    for (let i = 1; i <= 7; i++) {
      const nextDow = (currentDow + i) % 7;
      const h = ativos.find((x) => x.diaSemana === nextDow);
      if (h) {
        return { dia: i === 1 ? 'amanhã' : DIAS_PT[nextDow], hora: h.horaInicio };
      }
    }
  } catch {}
  return null;
}

export const isSistemaAberto = async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache');
  try {
    const br  = nowInBR();
    const dow = br.getDay();
    const agora = timeStr(br);
    const horario = await prisma.sistemaHorario.findUnique({ where: { diaSemana: dow } });

    if (!horario || !horario.ativo) {
      const proximaAbertura = await getProximaAbertura(dow);
      return res.status(200).json({
        aberto: false,
        motivo: 'O sistema não funciona neste dia.',
        proximaAbertura,
      });
    }

    const aberto = agora >= horario.horaInicio && agora < horario.horaFim;

    let proximaAbertura = null;
    if (!aberto) {
      if (agora < horario.horaInicio) {
        proximaAbertura = { dia: 'hoje', hora: horario.horaInicio };
      } else {
        proximaAbertura = await getProximaAbertura(dow);
      }
    }

    return res.status(200).json({
      aberto,
      horaInicio: horario.horaInicio,
      horaFim:    horario.horaFim,
      motivo: aberto ? null : `Fora do horário. Funciona das ${horario.horaInicio} às ${horario.horaFim}.`,
      proximaAbertura,
    });
  } catch {
    return res.status(200).json({ aberto: true });
  }
};

// ── GET /api/disponibilidade?data=YYYY-MM-DD ─────────────────────────────────

export const getDisponibilidade = async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache');
  const { data } = req.query;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({ error: 'Parâmetro "data" obrigatório no formato YYYY-MM-DD.' });
  }

  // Parseia à meia-noite de Brasília (-03:00) para garantir o dia correto
  // independente do timezone do servidor
  const dow = new Date(`${data}T00:00:00-03:00`).getDay();

  try {
    const horario = await prisma.sistemaHorario.findUnique({ where: { diaSemana: dow } });

    if (!horario || !horario.ativo) {
      return res.status(200).json({ slots: [], motivo: 'O sistema não funciona neste dia.' });
    }

    // Gera slots de 30 em 30 minutos entre horaInicio e horaFim
    const slots = [];
    const [startH, startM] = horario.horaInicio.split(':').map(Number);
    const [endH,   endM]   = horario.horaFim.split(':').map(Number);
    let cur = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (cur < end) {
      const h = String(Math.floor(cur / 60)).padStart(2, '0');
      const mn = String(cur % 60).padStart(2, '0');
      slots.push(`${h}:${mn}`);
      cur += 30;
    }

    return res.status(200).json({ slots, horaInicio: horario.horaInicio, horaFim: horario.horaFim });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar disponibilidade.' });
  }
};
