import { PrismaClient } from '@prisma/client';
import { logAction } from '../utils/logAction.js';

const prisma = new PrismaClient();

// ── endpoints existentes ─────────────────────────────────────────────────────

export const listPharmacists = async (req, res) => {
  try {
    const pharmacists = await prisma.user.findMany({
      where: { role: 'FARMACEUTICO' },
      include: {
        pharmacistProfile: true,
        _count: {
          select: {
            filaAgendadaComoFarmaceutico: { where: { status: 'concluido' } },
            filaUrgenteComoFarmaceutico:  { where: { status: 'concluido' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const result = pharmacists.map((p) => {
      const { _count, ...rest } = p;
      return { ...rest, consultasCount: _count.filaAgendadaComoFarmaceutico + _count.filaUrgenteComoFarmaceutico };
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar farmacêuticos.' });
  }
};

export const listPatients = async (req, res) => {
  try {
    const patients = await prisma.user.findMany({
      where: { role: 'PACIENTE' },
      include: {
        _count: {
          select: {
            filaAgendadaComoPaciente: { where: { status: 'concluido' } },
            filaUrgenteComoPaciente:  { where: { status: 'concluido' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const result = patients.map((p) => {
      const { _count, ...rest } = p;
      return { ...rest, consultasCount: _count.filaAgendadaComoPaciente + _count.filaUrgenteComoPaciente };
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
};

export const approvePharmacist = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    await prisma.pharmacistProfile.update({ where: { userId }, data: { isApproved: true } });
    return res.status(200).json({ message: 'Farmacêutico aprovado com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao aprovar farmacêutico.' });
  }
};

export const revokePharmacist = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    await prisma.pharmacistProfile.update({ where: { userId }, data: { isApproved: false } });
    return res.status(200).json({ message: 'Aprovação revogada.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao revogar aprovação.' });
  }
};

export const deletePharmacist = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pharmacistProfile: true },
    });
    if (!user || user.role !== 'FARMACEUTICO') {
      return res.status(404).json({ error: 'Farmacêutico não encontrado.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pharmacistProfile.delete({ where: { userId } });
      await tx.user.update({ where: { id: userId }, data: { role: 'PACIENTE' } });
    });

    return res.status(200).json({
      message: 'Farmacêutico descadastrado. Conta convertida para paciente.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao descadastrar farmacêutico.' });
  }
};

// ── novos endpoints v2 ───────────────────────────────────────────────────────

export const getMetricas = async (req, res) => {
  try {
    const [
      agendadaConcluidas, urgenteConcluidas,
      agendadaAbertas, urgenteAbertas,
      agendadaCanceladas, urgenteCanceladas,
      pacientes,
      farmaceuticosAtivos,
      farmaceuticosPendentes,
    ] = await Promise.all([
      prisma.filaAgendada.count({ where: { status: 'concluido' } }),
      prisma.filaUrgente.count({ where: { status: 'concluido' } }),
      prisma.filaAgendada.count({ where: { status: { in: ['aguardando', 'aceito'] } } }),
      prisma.filaUrgente.count({ where: { status: { in: ['aguardando', 'aceito'] } } }),
      prisma.filaAgendada.count({ where: { status: 'cancelado' } }),
      prisma.filaUrgente.count({ where: { status: 'cancelado' } }),
      prisma.user.count({ where: { role: 'PACIENTE' } }),
      prisma.pharmacistProfile.count({ where: { isApproved: true } }),
      prisma.pharmacistProfile.count({ where: { isApproved: false } }),
    ]);

    const consultasRealizadas = agendadaConcluidas + urgenteConcluidas;
    const consultasAgendadas  = agendadaAbertas + urgenteAbertas;
    const consultasCanceladas = agendadaCanceladas + urgenteCanceladas;

    return res.status(200).json({
      consultas_realizadas:   consultasRealizadas,
      consultas_agendadas:    consultasAgendadas,
      consultas_canceladas:   consultasCanceladas,
      usuarios_ativos:        { pacientes, farmaceuticos: farmaceuticosAtivos },
      farmaceuticos_pendentes: farmaceuticosPendentes,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar métricas.' });
  }
};

export const getDocumentos = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: id } });
    if (!profile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });
    if (!profile.urlDocIdentidade) return res.status(404).json({ error: 'Documentos ainda não enviados.' });

    const base = (process.env.BACKEND_URL || 'http://localhost:3000');
    return res.status(200).json({
      foto_rg_cnh: `${base}${profile.urlDocIdentidade}`,
      foto_crf:    `${base}${profile.urlDocCrf}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar documentos.' });
  }
};

export const setStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Ativo', 'Inativo'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use "Ativo" ou "Inativo".' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { pharmacistProfile: true },
    });
    if (!user?.pharmacistProfile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });

    const isAtivando = status === 'Ativo';

    await prisma.pharmacistProfile.update({ where: { userId: id }, data: { isApproved: isAtivando } });

    return res.status(200).json({
      success: true,
      message: isAtivando
        ? 'Cadastro ativado com sucesso. Profissional liberado.'
        : 'Farmacêutico inativado.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
};

// Mantidos por compatibilidade com Módulo 3
export const listarPendentes = async (req, res) => {
  try {
    const pharmacists = await prisma.user.findMany({
      where: { role: 'FARMACEUTICO', pharmacistProfile: { isApproved: false } },
      include: { pharmacistProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(
      pharmacists.map((u) => ({
        id:          u.id,
        nome:        u.name,
        email:       u.email,
        crf_numero:  u.pharmacistProfile ? `${u.pharmacistProfile.crfNumber}/${u.pharmacistProfile.crfUF}` : null,
        createdAt:   u.createdAt,
        docs_enviados: Boolean(u.pharmacistProfile?.urlDocIdentidade),
        urls_documentos: {
          rg_cnh: u.pharmacistProfile?.urlDocIdentidade || null,
          crf:    u.pharmacistProfile?.urlDocCrf    || null,
        },
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pendentes.' });
  }
};

export const ativarFarmaceutico = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: id } });
    if (!profile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });
    await prisma.pharmacistProfile.update({ where: { userId: id }, data: { isApproved: true } });
    return res.status(200).json({ message: 'Cadastro ativado com sucesso. Profissional liberado.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao ativar farmacêutico.' });
  }
};


// ── Sistema de agendamentos ───────────────────────────────────────────────────

export const getSistemaStatus = async (req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'sistema_aberto' } });
    return res.status(200).json({ sistema_aberto: config ? config.value === 'true' : true });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar status do sistema.' });
  }
};

export const toggleSistema = async (req, res) => {
  try {
    const { aberto } = req.body;
    if (typeof aberto !== 'boolean') {
      return res.status(400).json({ error: 'aberto deve ser true ou false.' });
    }
    await prisma.systemConfig.upsert({
      where:  { key: 'sistema_aberto' },
      update: { value: aberto ? 'true' : 'false' },
      create: { key: 'sistema_aberto', value: aberto ? 'true' : 'false' },
    });
    return res.status(200).json({ success: true, sistema_aberto: aberto });
  } catch {
    return res.status(500).json({ error: 'Erro ao atualizar status do sistema.' });
  }
};

export const getLogs = async (req, res) => {
  const {
    acao, de, ate, farmaceuticoId, pacienteId, tipo,
    page = '1', limit = '20',
    export: exportFormat,
  } = req.query;

  const isExport = exportFormat === 'csv';
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = isExport ? 10000 : Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = isExport ? 0 : (pageNum - 1) * limitNum;

  try {
    const conditions = ['1=1'];
    const params     = [];

    if (acao)           { conditions.push(`l.acao = $${params.length + 1}`);                    params.push(acao); }
    if (de)             { conditions.push(`l.criado_em >= $${params.length + 1}`);              params.push(`${de}T00:00:00-03:00`); }
    if (ate)            { conditions.push(`l.criado_em <= $${params.length + 1}`);              params.push(`${ate}T23:59:59-03:00`); }
    if (farmaceuticoId) { conditions.push(`l.usuario_id = $${params.length + 1}`);             params.push(farmaceuticoId); }
    if (tipo)           { conditions.push(`(l.detalhes->>'tipo') = $${params.length + 1}`);    params.push(tipo); }
    if (pacienteId)     { conditions.push(
      `COALESCE(fa."pacienteId"::text, fu."pacienteId"::text) = $${params.length + 1}`);       params.push(pacienteId); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const joins = `
      FROM log_acoes l
      LEFT JOIN "User" u       ON u.id::text = l.usuario_id
      LEFT JOIN "FilaAgendada" fa ON fa.id::text = l.consulta_id AND (l.detalhes->>'tipo') = 'agendada'
      LEFT JOIN "FilaUrgente"  fu ON fu.id::text = l.consulta_id AND (l.detalhes->>'tipo') = 'urgente'
      LEFT JOIN "User" pu_ag   ON pu_ag.id = fa."pacienteId"
      LEFT JOIN "User" pu_ur   ON pu_ur.id = fu."pacienteId"
    `;

    const [countRow] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total ${joins} ${where}`,
      ...params
    );
    const total = Number(countRow?.total ?? 0);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT l.id, l.consulta_id, l.usuario_id, l.role, l.acao, l.detalhes, l.criado_em,
              u.name AS usuario_nome,
              COALESCE(pu_ag.name, pu_ur.name) AS paciente_nome,
              (l.detalhes->>'duracao_min')::int AS duracao_min,
              COALESCE(l.detalhes->>'tipo', '') AS tipo,
              COALESCE(fa."dataHora", fu."criadoEm") AS consulta_data_hora
       ${joins} ${where}
       ORDER BY l.criado_em DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params, limitNum, skip
    );

    const items = rows.map((r) => ({
      id:               r.id,
      consultaId:       r.consulta_id,
      usuarioId:        r.usuario_id,
      usuarioNome:      r.usuario_nome ?? '—',
      pacienteNome:     r.paciente_nome ?? null,
      role:             r.role,
      acao:             r.acao,
      detalhes:         r.detalhes ?? {},
      criadoEm:         r.criado_em,
      duracaoMin:       r.duracao_min != null ? Number(r.duracao_min) : null,
      tipo:             r.tipo || null,
      consultaDataHora: r.consulta_data_hora ?? null,
    }));

    if (isExport) {
      const fmtMin = (m) => {
        if (m == null) return '';
        if (m < 60) return `${m}min`;
        const h = Math.floor(m / 60), min = m % 60;
        return min > 0 ? `${h}h ${min}min` : `${h}h`;
      };
      const header = 'Data/Hora,Paciente,Farmacêutico,Ação,Tempo,Tipo,Detalhes\n';
      const csvRows = items.map((item) => {
        const dt  = new Date(item.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const det = JSON.stringify(item.detalhes ?? {}).replace(/"/g, '""');
        return [
          `"${dt}"`, `"${item.pacienteNome ?? ''}"`, `"${item.usuarioNome}"`,
          `"${item.acao}"`, `"${fmtMin(item.duracaoMin)}"`, `"${item.tipo ?? ''}"`, `"${det}"`,
        ].join(',');
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send('﻿' + header + csvRows.join('\n'));
    }

    return res.status(200).json({ items, total, page: pageNum, hasMore: skip + limitNum < total });
  } catch (err) {
    if (err.message?.includes('log_acoes') || err.message?.includes('does not exist')) {
      return res.status(200).json({ items: [], total: 0, page: 1, hasMore: false });
    }
    console.error('getLogs error:', err);
    return res.status(500).json({ error: 'Erro ao buscar logs.' });
  }
};

// ── Gestão financeira ─────────────────────────────────────────────────────────

export const getConfigFinanceiro = async (req, res) => {
  try {
    const [precoRow, comissaoRow, maxUrgRow, farmaceuticos] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'preco_consulta' } }),
      prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
      prisma.systemConfig.findUnique({ where: { key: 'max_urgencias_simultaneas' } }),
      prisma.user.findMany({
        where: { role: 'FARMACEUTICO' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    let comissoes = [];
    try {
      comissoes = await prisma.$queryRawUnsafe(
        `SELECT farmaceutico_id, CAST(percentual AS FLOAT) AS percentual FROM comissoes_individuais`
      );
    } catch (_) {}

    const comissaoMap = {};
    for (const c of comissoes) comissaoMap[c.farmaceutico_id] = c.percentual;

    return res.json({
      preco:                 parseFloat(precoRow?.value ?? '50.00'),
      comissaoPadrao:        parseFloat(comissaoRow?.value ?? '70'),
      maxUrgenciasSimult:    parseInt(maxUrgRow?.value ?? '1', 10),
      farmaceuticos:         farmaceuticos.map((f) => ({
        id:       f.id,
        name:     f.name,
        email:    f.email,
        comissao: comissaoMap[f.id] ?? null,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar configuração financeira.' });
  }
};

export const setPreco = async (req, res) => {
  const valor = parseFloat(req.body.valor);
  if (isNaN(valor) || valor <= 0) return res.status(400).json({ error: 'Valor inválido.' });
  try {
    await prisma.systemConfig.upsert({
      where:  { key: 'preco_consulta' },
      update: { value: valor.toFixed(2) },
      create: { key: 'preco_consulta', value: valor.toFixed(2) },
    });
    return res.json({ preco: valor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar preço.' });
  }
};

export const setComissaoPadrao = async (req, res) => {
  const percentual = parseFloat(req.body.percentual);
  if (isNaN(percentual) || percentual < 0 || percentual > 100) {
    return res.status(400).json({ error: 'Percentual inválido (0–100).' });
  }
  try {
    await prisma.systemConfig.upsert({
      where:  { key: 'comissao_padrao' },
      update: { value: String(percentual) },
      create: { key: 'comissao_padrao', value: String(percentual) },
    });
    return res.json({ comissaoPadrao: percentual });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar comissão padrão.' });
  }
};

export const setConfig = async (req, res) => {
  const preco      = parseFloat(req.body.preco_consulta);
  const percentual = parseFloat(req.body.comissao_padrao);
  const maxUrg     = parseInt(req.body.max_urgencias_simultaneas ?? '1', 10);
  if (isNaN(preco) || preco <= 0)                              return res.status(400).json({ error: 'Preço inválido.' });
  if (isNaN(percentual) || percentual < 0 || percentual > 100) return res.status(400).json({ error: 'Comissão inválida (0–100).' });
  if (isNaN(maxUrg) || maxUrg < 1 || maxUrg > 20)             return res.status(400).json({ error: 'Limite de urgências inválido (1–20).' });
  try {
    await Promise.all([
      prisma.systemConfig.upsert({
        where:  { key: 'preco_consulta' },
        update: { value: preco.toFixed(2) },
        create: { key: 'preco_consulta', value: preco.toFixed(2) },
      }),
      prisma.systemConfig.upsert({
        where:  { key: 'comissao_padrao' },
        update: { value: String(percentual) },
        create: { key: 'comissao_padrao', value: String(percentual) },
      }),
      prisma.systemConfig.upsert({
        where:  { key: 'max_urgencias_simultaneas' },
        update: { value: String(maxUrg) },
        create: { key: 'max_urgencias_simultaneas', value: String(maxUrg) },
      }),
    ]);
    return res.json({ preco_consulta: preco, comissao_padrao: percentual, max_urgencias_simultaneas: maxUrg });
  } catch (err) {
    console.error('[AdminConfig] Erro ao salvar:', err);
    return res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
};

export const setComissaoFarmaceutico = async (req, res) => {
  const { id } = req.params;
  const { percentual } = req.body;
  try {
    if (percentual === null || percentual === undefined || percentual === '') {
      await prisma.$executeRawUnsafe(
        `DELETE FROM comissoes_individuais WHERE farmaceutico_id = $1`, id
      );
      return res.json({ id, comissao: null });
    }
    const pct = parseFloat(percentual);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'Percentual inválido (0–100).' });
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO comissoes_individuais (farmaceutico_id, percentual, atualizado_em)
       VALUES ($1, $2, NOW())
       ON CONFLICT (farmaceutico_id) DO UPDATE SET percentual = $2, atualizado_em = NOW()`,
      id, pct
    );
    return res.json({ id, comissao: pct });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar comissão.' });
  }
};

export const deleteComissaoFarmaceutico = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM comissoes_individuais WHERE farmaceutico_id = $1`, id
    );
    return res.json({ id, comissao: null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao remover comissão individual.' });
  }
};

export const getVisaoFinanceira = async (req, res) => {
  try {
    const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const yyyy  = nowBR.getFullYear();
    const mm    = String(nowBR.getMonth() + 1).padStart(2, '0');
    const dd    = String(nowBR.getDate()).padStart(2, '0');
    const deStr  = req.query.de  || `${yyyy}-${mm}-01`;
    const ateStr = req.query.ate || `${yyyy}-${mm}-${dd}`;

    const deDate  = new Date(`${deStr}T00:00:00-03:00`);
    const ateDate = new Date(`${ateStr}T23:59:59-03:00`);

    const [comissaoRow, agendadas, urgentes] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
      prisma.filaAgendada.findMany({
        where:  { status: 'concluido', dataHora: { gte: deDate, lte: ateDate } },
        select: { farmaceuticoId: true, creditoDebitado: true },
      }),
      prisma.filaUrgente.findMany({
        where:  { status: 'concluido', criadoEm: { gte: deDate, lte: ateDate } },
        select: { farmaceuticoId: true, creditoDebitado: true },
      }),
    ]);

    let comissoes = [];
    try {
      comissoes = await prisma.$queryRawUnsafe(
        `SELECT farmaceutico_id, CAST(percentual AS FLOAT) AS percentual FROM comissoes_individuais`
      );
    } catch (_) {}

    const comissaoPadrao = parseFloat(comissaoRow?.value ?? '70');
    const comissaoMap = {};
    for (const c of comissoes) comissaoMap[c.farmaceutico_id] = c.percentual;

    const allItems = [
      ...agendadas.map((f) => ({ farmaceuticoId: f.farmaceuticoId, valor: Number(f.creditoDebitado) })),
      ...urgentes.map((f)  => ({ farmaceuticoId: f.farmaceuticoId, valor: Number(f.creditoDebitado) })),
    ];

    const totalFaturado = allItems.reduce((s, i) => s + i.valor, 0);
    const totalPagoFarm = allItems.reduce((s, i) => {
      const pct = comissaoMap[i.farmaceuticoId] ?? comissaoPadrao;
      return s + i.valor * (pct / 100);
    }, 0);

    return res.json({
      totalFaturado:        Math.round(totalFaturado * 100) / 100,
      totalPagoFarm:        Math.round(totalPagoFarm * 100) / 100,
      receitaLiquida:       Math.round((totalFaturado - totalPagoFarm) * 100) / 100,
      consultasConcluidas:  allItems.length,
      periodo:              { de: deStr, ate: ateStr },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar visão financeira.' });
  }
};

// ── POST /api/admin/farmaceuticos/:id/suspender ──────────────────────────────

export const suspenderFarmaceutico = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id ?? 'admin';
  try {
    const user = await prisma.user.findUnique({
      where:   { id },
      include: { pharmacistProfile: true },
    });
    if (!user?.pharmacistProfile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });
    if (user.pharmacistProfile.isSuspended) return res.status(400).json({ error: 'Farmacêutico já está suspenso.' });

    let consultasCanceladas = [];
    await prisma.$transaction(async (tx) => {
      // Cancela FilaAgendada futuras aceitas
      consultasCanceladas = await tx.$queryRawUnsafe(
        `UPDATE "FilaAgendada" SET status = 'cancelado' WHERE "farmaceuticoId" = $1 AND status IN ('aceito') AND "dataHora" > NOW() RETURNING id`,
        id
      );

      await tx.pharmacistProfile.update({
        where: { userId: id },
        data:  { isApproved: false, isSuspended: true, disponivelUrgencias: false },
      });
    });

    await logAction(prisma, {
      consultaId: null,
      usuarioId:  adminId,
      role:       'ADMIN',
      acao:       'farmaceutico_suspenso',
      detalhes:   { farmaceuticoId: id, consultasCanceladas: consultasCanceladas.length },
    });

    return res.status(200).json({
      success: true,
      message: `Farmacêutico suspenso. ${consultasCanceladas.length} consulta(s) futura(s) cancelada(s).`,
    });
  } catch (err) {
    console.error('suspenderFarmaceutico error:', err);
    return res.status(500).json({ error: 'Erro ao suspender farmacêutico.' });
  }
};

// ── POST /api/admin/farmaceuticos/:id/reativar ───────────────────────────────

export const reativarFarmaceutico = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id ?? 'admin';
  try {
    const user = await prisma.user.findUnique({
      where:   { id },
      include: { pharmacistProfile: true },
    });
    if (!user?.pharmacistProfile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });

    await prisma.pharmacistProfile.update({
      where: { userId: id },
      data:  { isApproved: true, isSuspended: false, disponivelUrgencias: true },
    });

    await logAction(prisma, {
      consultaId: null,
      usuarioId:  adminId,
      role:       'ADMIN',
      acao:       'farmaceutico_reativado',
      detalhes:   { farmaceuticoId: id },
    });

    return res.status(200).json({ success: true, message: 'Farmacêutico reativado com sucesso.' });
  } catch (err) {
    console.error('reativarFarmaceutico error:', err);
    return res.status(500).json({ error: 'Erro ao reativar farmacêutico.' });
  }
};
