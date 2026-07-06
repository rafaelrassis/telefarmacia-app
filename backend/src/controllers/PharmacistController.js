import { PrismaClient } from '@prisma/client';
import { notifyAdminNewPharmacist } from '../services/emailService.js';

const prisma = new PrismaClient();

export const updateProfile = async (req, res) => {
  try {
    if (req.user.role !== 'FARMACEUTICO') {
      return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
    }
    const { bio, tags } = req.body;
    const updated = await prisma.pharmacistProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(bio !== undefined && { bio: bio.trim() }),
        ...(Array.isArray(tags) && { tags }),
      },
    });
    return res.status(200).json({ message: 'Perfil atualizado com sucesso.', profile: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
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
