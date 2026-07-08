import { PrismaClient } from '@prisma/client';
import { logAction } from '../utils/logAction.js';
import { logAdminAction } from '../utils/logAdminAction.js';
import { criarNotificacao } from './NotificacaoController.js';
import { invalidateAdminEmailsCache } from '../middlewares/adminMiddleware.js';

const prisma = new PrismaClient();

// ── endpoints existentes ─────────────────────────────────────────────────────

export const listPharmacists = async (req, res) => {
  const { page = '1', limit = '500' } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;
  try {
    const [total, pharmacists] = await Promise.all([
      prisma.user.count({ where: { role: 'FARMACEUTICO' } }),
      prisma.user.findMany({
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
        skip, take: limitNum,
      }),
    ]);

    let ocorrenciasMap = {};
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT usuario_id, COUNT(*)::int AS total FROM log_acoes
         WHERE acao IN ('devolvido','sem_contato') AND criado_em >= NOW() - INTERVAL '30 days'
         GROUP BY usuario_id`
      );
      for (const r of rows) ocorrenciasMap[r.usuario_id] = r.total;
    } catch (_) {}

    const data = pharmacists.map((p) => {
      const { _count, ...rest } = p;
      return {
        ...rest,
        consultasCount: _count.filaAgendadaComoFarmaceutico + _count.filaUrgenteComoFarmaceutico,
        ocorrencias30d: ocorrenciasMap[p.id] ?? 0,
      };
    });
    return res.status(200).json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar farmacêuticos.' });
  }
};

export const getOcorrenciasFarmaceutico = async (req, res) => {
  const { id } = req.params;
  const { page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;
  try {
    const [countRow] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM log_acoes
       WHERE usuario_id = $1 AND acao IN ('devolvido','sem_contato') AND criado_em >= NOW() - INTERVAL '30 days'`,
      id
    );
    const total = Number(countRow?.total ?? 0);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, consulta_id, acao, detalhes, criado_em FROM log_acoes
       WHERE usuario_id = $1 AND acao IN ('devolvido','sem_contato') AND criado_em >= NOW() - INTERVAL '30 days'
       ORDER BY criado_em DESC
       LIMIT $2 OFFSET $3`,
      id, limitNum, skip
    );

    const data = rows.map((r) => ({
      id:         r.id,
      consultaId: r.consulta_id,
      acao:       r.acao,
      detalhes:   r.detalhes ?? {},
      criadoEm:   r.criado_em,
    }));

    return res.status(200).json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    if (err.message?.includes('log_acoes')) {
      return res.status(200).json({ data: [], total: 0, page: 1, totalPages: 1 });
    }
    console.error('getOcorrenciasFarmaceutico error:', err);
    return res.status(500).json({ error: 'Erro ao buscar ocorrências.' });
  }
};

export const listPatients = async (req, res) => {
  const { page = '1', limit = '500' } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;
  try {
    const [total, patients] = await Promise.all([
      prisma.user.count({ where: { role: 'PACIENTE' } }),
      prisma.user.findMany({
        where: { role: 'PACIENTE' },
        include: {
          carteira: { select: { saldo: true } },
          _count: {
            select: {
              filaAgendadaComoPaciente: { where: { status: 'concluido' } },
              filaUrgenteComoPaciente:  { where: { status: 'concluido' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limitNum,
      }),
    ]);
    const data = patients.map((p) => {
      const { _count, carteira, ...rest } = p;
      return {
        ...rest,
        consultasCount: _count.filaAgendadaComoPaciente + _count.filaUrgenteComoPaciente,
        saldo: carteira ? Number(carteira.saldo) : 0,
      };
    });
    return res.status(200).json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pacientes.' });
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

    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'descadastrar_farmaceutico', alvoTipo: 'farmaceutico', alvoId: userId,
      detalhes: { nome: user.name, email: user.email },
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
    const jaAprovado = user.pharmacistProfile.isApproved;

    await prisma.pharmacistProfile.update({ where: { userId: id }, data: { isApproved: isAtivando } });

    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'alterar_status_farmaceutico', alvoTipo: 'farmaceutico', alvoId: id,
      detalhes: { status },
    });

    if (isAtivando && !jaAprovado) {
      await criarNotificacao({
        userId:   id,
        tipo:     'conta_aprovada',
        titulo:   'Cadastro aprovado!',
        mensagem: 'Seu cadastro de farmacêutico foi aprovado. Você já pode receber consultas.',
      });
    }

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
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'toggle_sistema', alvoTipo: 'config', detalhes: { aberto },
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

    return res.status(200).json({ data: items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    if (err.message?.includes('log_acoes') || err.message?.includes('does not exist')) {
      return res.status(200).json({ data: [], total: 0, page: 1, totalPages: 1 });
    }
    console.error('getLogs error:', err);
    return res.status(500).json({ error: 'Erro ao buscar logs.' });
  }
};

// ── Gestão financeira ─────────────────────────────────────────────────────────

export const getConfigFinanceiro = async (req, res) => {
  try {
    const [precoRow, comissaoRow, maxUrgRow, toleranciaRow, limiteOcorrenciasRow, farmaceuticos] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'preco_consulta' } }),
      prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
      prisma.systemConfig.findUnique({ where: { key: 'max_urgencias_simultaneas' } }),
      prisma.systemConfig.findUnique({ where: { key: 'tolerancia_expiracao_agendada_min' } }),
      prisma.systemConfig.findUnique({ where: { key: 'limite_ocorrencias_30d' } }),
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
      toleranciaExpiracaoAgendadaMin: parseInt(toleranciaRow?.value ?? '30', 10),
      limiteOcorrencias30d:  parseInt(limiteOcorrenciasRow?.value ?? '5', 10),
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
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'set_preco_consulta', alvoTipo: 'config', detalhes: { valor },
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
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'set_comissao_padrao', alvoTipo: 'config', detalhes: { percentual },
    });
    return res.json({ comissaoPadrao: percentual });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar comissão padrão.' });
  }
};

export const setConfig = async (req, res) => {
  const preco       = parseFloat(req.body.preco_consulta);
  const percentual  = parseFloat(req.body.comissao_padrao);
  const maxUrg      = parseInt(req.body.max_urgencias_simultaneas ?? '1', 10);
  const tolerancia  = parseInt(req.body.tolerancia_expiracao_agendada_min ?? '30', 10);
  const limiteOcorrencias = parseInt(req.body.limite_ocorrencias_30d ?? '5', 10);
  if (isNaN(preco) || preco <= 0)                              return res.status(400).json({ error: 'Preço inválido.' });
  if (isNaN(percentual) || percentual < 0 || percentual > 100) return res.status(400).json({ error: 'Comissão inválida (0–100).' });
  if (isNaN(maxUrg) || maxUrg < 1 || maxUrg > 20)             return res.status(400).json({ error: 'Limite de urgências inválido (1–20).' });
  if (isNaN(tolerancia) || tolerancia < 5 || tolerancia > 240) return res.status(400).json({ error: 'Tolerância de expiração inválida (5–240 min).' });
  if (isNaN(limiteOcorrencias) || limiteOcorrencias < 1 || limiteOcorrencias > 50) {
    return res.status(400).json({ error: 'Limite de ocorrências inválido (1–50).' });
  }
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
      prisma.systemConfig.upsert({
        where:  { key: 'tolerancia_expiracao_agendada_min' },
        update: { value: String(tolerancia) },
        create: { key: 'tolerancia_expiracao_agendada_min', value: String(tolerancia) },
      }),
      prisma.systemConfig.upsert({
        where:  { key: 'limite_ocorrencias_30d' },
        update: { value: String(limiteOcorrencias) },
        create: { key: 'limite_ocorrencias_30d', value: String(limiteOcorrencias) },
      }),
    ]);
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'set_config_financeiro', alvoTipo: 'config',
      detalhes: {
        preco_consulta: preco, comissao_padrao: percentual, max_urgencias_simultaneas: maxUrg,
        tolerancia_expiracao_agendada_min: tolerancia, limite_ocorrencias_30d: limiteOcorrencias,
      },
    });
    return res.json({
      preco_consulta: preco, comissao_padrao: percentual, max_urgencias_simultaneas: maxUrg,
      tolerancia_expiracao_agendada_min: tolerancia, limite_ocorrencias_30d: limiteOcorrencias,
    });
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
      await logAdminAction(prisma, {
        adminId: req.user?.id, acao: 'remover_comissao_individual', alvoTipo: 'farmaceutico', alvoId: id,
      });
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
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'set_comissao_individual', alvoTipo: 'farmaceutico', alvoId: id,
      detalhes: { percentual: pct },
    });
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
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'remover_comissao_individual', alvoTipo: 'farmaceutico', alvoId: id,
    });
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

// ── GET /api/admin/financeiro/export?de=&ate= ────────────────────────────────

export const exportFinanceiro = async (req, res) => {
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
        select: { dataHora: true, creditoDebitado: true, farmaceuticoId: true, farmaceutico: { select: { name: true } } },
      }),
      prisma.filaUrgente.findMany({
        where:  { status: 'concluido', criadoEm: { gte: deDate, lte: ateDate } },
        select: { criadoEm: true, creditoDebitado: true, farmaceuticoId: true, farmaceutico: { select: { name: true } } },
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

    const rows = [
      ...agendadas.map((f) => ({
        data: f.dataHora, tipo: 'Agendada', farmaceutico: f.farmaceutico?.name ?? '—',
        valor: Number(f.creditoDebitado), pct: comissaoMap[f.farmaceuticoId] ?? comissaoPadrao,
      })),
      ...urgentes.map((f) => ({
        data: f.criadoEm, tipo: 'Urgente', farmaceutico: f.farmaceutico?.name ?? '—',
        valor: Number(f.creditoDebitado), pct: comissaoMap[f.farmaceuticoId] ?? comissaoPadrao,
      })),
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    const fmtDec = (n) => n.toFixed(2).replace('.', ',');
    const header = 'Data;Tipo;Farmacêutico;Valor Faturado;% Comissão;Valor Farmacêutico;Valor Líquido\n';
    const csvRows = rows.map((r) => {
      const dt          = new Date(r.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const valorFarm    = Math.round(r.valor * (r.pct / 100) * 100) / 100;
      const valorLiquido = Math.round((r.valor - valorFarm) * 100) / 100;
      return [
        `"${dt}"`, `"${r.tipo}"`, `"${r.farmaceutico}"`,
        fmtDec(r.valor), fmtDec(r.pct), fmtDec(valorFarm), fmtDec(valorLiquido),
      ].join(';');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="financeiro-${deStr}_a_${ateStr}.csv"`);
    return res.send('﻿' + header + csvRows.join('\n'));
  } catch (err) {
    console.error('exportFinanceiro error:', err);
    return res.status(500).json({ error: 'Erro ao exportar financeiro.' });
  }
};

// ── POST /api/admin/carteira/:pacienteId/ajuste ──────────────────────────────

export const ajustarCarteira = async (req, res) => {
  const { pacienteId } = req.params;
  const adminId = req.user?.id ?? 'admin';
  const valor  = parseFloat(req.body.valor);
  const motivo = (req.body.motivo ?? '').trim();

  if (isNaN(valor) || valor === 0)  return res.status(400).json({ error: 'Valor inválido — informe um valor diferente de zero.' });
  if (motivo.length < 3)            return res.status(400).json({ error: 'Informe um motivo (mín. 3 caracteres).' });

  try {
    const paciente = await prisma.user.findUnique({ where: { id: pacienteId }, select: { id: true, role: true } });
    if (!paciente || paciente.role !== 'PACIENTE') return res.status(404).json({ error: 'Paciente não encontrado.' });

    const existente = await prisma.carteira.findUnique({ where: { pacienteId } });
    const saldoAtual = existente ? Number(existente.saldo) : 0;
    if (saldoAtual + valor < 0) {
      return res.status(400).json({ error: `Ajuste deixaria o saldo negativo (saldo atual: R$ ${saldoAtual.toFixed(2)}).` });
    }

    const carteira = await prisma.$transaction(async (tx) => {
      const c = await tx.carteira.upsert({
        where:  { pacienteId },
        update: { saldo: { increment: valor } },
        create: { pacienteId, saldo: valor },
      });
      await tx.transacaoCarteira.create({
        data: {
          carteiraId: c.id,
          tipo:       'ajuste_admin',
          valor:      Math.abs(valor),
          saldoApos:  c.saldo,
          descricao:  `Ajuste manual (admin): ${motivo}`,
        },
      });
      return c;
    });

    await logAdminAction(prisma, {
      adminId, acao: 'ajustar_carteira', alvoTipo: 'paciente', alvoId: pacienteId,
      detalhes: { valor, motivo, saldoApos: Number(carteira.saldo) },
    });

    await criarNotificacao({
      userId:   pacienteId,
      tipo:     'ajuste_carteira',
      titulo:   valor > 0 ? 'Crédito adicionado à sua carteira' : 'Ajuste na sua carteira',
      mensagem: `Um administrador ${valor > 0 ? 'adicionou' : 'removeu'} R$ ${Math.abs(valor).toFixed(2)} da sua carteira. Motivo: ${motivo}`,
    });

    return res.status(200).json({ saldo: Number(carteira.saldo) });
  } catch (err) {
    console.error('ajustarCarteira error:', err);
    return res.status(500).json({ error: 'Erro ao ajustar carteira.' });
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
    await logAdminAction(prisma, {
      adminId, acao: 'suspender_farmaceutico', alvoTipo: 'farmaceutico', alvoId: id,
      detalhes: { consultasCanceladas: consultasCanceladas.length },
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
    await logAdminAction(prisma, {
      adminId, acao: 'reativar_farmaceutico', alvoTipo: 'farmaceutico', alvoId: id,
    });

    return res.status(200).json({ success: true, message: 'Farmacêutico reativado com sucesso.' });
  } catch (err) {
    console.error('reativarFarmaceutico error:', err);
    return res.status(500).json({ error: 'Erro ao reativar farmacêutico.' });
  }
};

// ── GET /api/admin/audit — auditoria de ações administrativas ───────────────

export const getAdminAuditLog = async (req, res) => {
  const { acao, adminId, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;

  try {
    const where = {
      ...(acao && { acao }),
      ...(adminId && { adminId }),
    };

    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: { admin: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limitNum,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id:        r.id,
      adminId:   r.adminId,
      adminNome: r.admin?.name  ?? '—',
      adminEmail: r.admin?.email ?? null,
      acao:      r.acao,
      alvoTipo:  r.alvoTipo,
      alvoId:    r.alvoId,
      detalhes:  r.detalhes ?? {},
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error('getAdminAuditLog error:', err);
    return res.status(500).json({ error: 'Erro ao buscar auditoria de ações.' });
  }
};

// ── GET /api/admin/consultas — fila agendada + urgente (visão admin) ────────

export const getConsultasAdmin = async (req, res) => {
  const { tipo = 'todas', status, de, ate, q, expirada, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;

  try {
    const wantAgendada = tipo === 'todas' || tipo === 'agendada';
    const wantUrgente  = tipo === 'todas' || tipo === 'urgente';

    const dateFilter = {};
    if (de)  dateFilter.gte = new Date(`${de}T00:00:00-03:00`);
    if (ate) dateFilter.lte = new Date(`${ate}T23:59:59-03:00`);

    const pessoaSelect = { select: { name: true, email: true } };

    const [agendadas, urgentes] = await Promise.all([
      wantAgendada ? prisma.filaAgendada.findMany({
        where: {
          ...(status && { status }),
          ...(Object.keys(dateFilter).length > 0 && { dataHora: dateFilter }),
        },
        include: { paciente: pessoaSelect, farmaceutico: pessoaSelect },
        orderBy: { dataHora: 'desc' },
      }) : Promise.resolve([]),
      wantUrgente ? prisma.filaUrgente.findMany({
        where: {
          ...(status && { status }),
          ...(Object.keys(dateFilter).length > 0 && { criadoEm: dateFilter }),
        },
        include: { paciente: pessoaSelect, farmaceutico: pessoaSelect },
        orderBy: { criadoEm: 'desc' },
      }) : Promise.resolve([]),
    ]);

    let normalized = [
      ...agendadas.map((f) => ({
        id: f.id, tipo: 'agendada', status: f.status,
        dataHora: f.dataHora, criadoEm: f.criadoEm,
        paciente: f.paciente, farmaceutico: f.farmaceutico,
        creditoDebitado: Number(f.creditoDebitado),
      })),
      ...urgentes.map((f) => ({
        id: f.id, tipo: 'urgente', status: f.status,
        dataHora: f.aceitoEm ?? f.criadoEm, criadoEm: f.criadoEm,
        paciente: f.paciente, farmaceutico: f.farmaceutico,
        creditoDebitado: Number(f.creditoDebitado),
      })),
    ];

    if (q?.trim()) {
      const needle = q.trim().toLowerCase();
      normalized = normalized.filter((c) =>
        c.paciente?.name?.toLowerCase().includes(needle) ||
        c.paciente?.email?.toLowerCase().includes(needle) ||
        c.farmaceutico?.name?.toLowerCase().includes(needle) ||
        c.farmaceutico?.email?.toLowerCase().includes(needle)
      );
    }

    if (expirada === 'true') {
      const allAgIds = normalized.filter((d) => d.tipo === 'agendada').map((d) => d.id);
      const allUrIds = normalized.filter((d) => d.tipo === 'urgente').map((d) => d.id);
      const expiradaIds = new Set();
      try {
        const [rowsA, rowsU] = await Promise.all([
          allAgIds.length > 0
            ? prisma.$queryRawUnsafe(`SELECT id FROM "FilaAgendada" WHERE id = ANY($1::text[]) AND motivo_cancelamento ILIKE 'Expirada%'`, allAgIds)
            : Promise.resolve([]),
          allUrIds.length > 0
            ? prisma.$queryRawUnsafe(`SELECT id FROM "FilaUrgente" WHERE id = ANY($1::text[]) AND motivo_cancelamento ILIKE 'Expirada%'`, allUrIds)
            : Promise.resolve([]),
        ]);
        [...rowsA, ...rowsU].forEach((r) => expiradaIds.add(r.id));
      } catch (_) {}
      normalized = normalized.filter((d) => expiradaIds.has(d.id));
    }

    normalized.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

    const total = normalized.length;
    const data  = normalized.slice(skip, skip + limitNum);

    // Busca o campo raw "motivo" em lote apenas para os itens da página atual
    const agIds = data.filter((d) => d.tipo === 'agendada').map((d) => d.id);
    const urIds = data.filter((d) => d.tipo === 'urgente').map((d) => d.id);
    const motivoMap = {};
    try {
      const [rowsA, rowsU] = await Promise.all([
        agIds.length > 0
          ? prisma.$queryRawUnsafe(`SELECT id, motivo FROM "FilaAgendada" WHERE id = ANY($1::text[])`, agIds)
          : Promise.resolve([]),
        urIds.length > 0
          ? prisma.$queryRawUnsafe(`SELECT id, motivo FROM "FilaUrgente" WHERE id = ANY($1::text[])`, urIds)
          : Promise.resolve([]),
      ]);
      [...rowsA, ...rowsU].forEach((r) => { motivoMap[r.id] = r.motivo ?? null; });
    } catch (_) {}
    data.forEach((d) => { d.motivo = motivoMap[d.id] ?? null; });

    return res.status(200).json({
      data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error('getConsultasAdmin error:', err);
    return res.status(500).json({ error: 'Erro ao buscar consultas.' });
  }
};

// ── GET /api/admin/fila/tempo-real — dashboard operacional ──────────────────

export const getFilaTempoReal = async (req, res) => {
  try {
    const agora        = new Date();
    const em24h        = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
    const doisMinAtras  = new Date(agora.getTime() - 2 * 60 * 1000);
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inicioHoje    = new Date(agora); inicioHoje.setHours(0, 0, 0, 0);

    let expiradasHoje = 0;
    try {
      const [row] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS total FROM log_acoes
         WHERE acao IN ('expirada', 'expirado_aguardando', 'expirado_aceito') AND criado_em >= $1`,
        inicioHoje
      );
      expiradasHoje = Number(row?.total ?? 0);
    } catch (_) {}

    const [
      urgentesAguardando,
      agendadasAguardando24h,
      emAtendimentoAg,
      emAtendimentoUr,
      farmaceuticosOnline,
      disponiveisUrgencia,
      urgentesAceitas7d,
      agendadasAceitas7d,
    ] = await Promise.all([
      prisma.filaUrgente.findMany({
        where: { status: 'aguardando' }, select: { criadoEm: true }, orderBy: { criadoEm: 'asc' },
      }),
      prisma.filaAgendada.count({ where: { status: 'aguardando', dataHora: { lte: em24h } } }),
      prisma.filaAgendada.count({ where: { status: 'em_atendimento' } }),
      prisma.filaUrgente.count({ where: { status: 'em_atendimento' } }),
      prisma.farmaceuticoStatus.count({ where: { ultimoPing: { gte: doisMinAtras } } }),
      prisma.pharmacistProfile.count({
        where: { isApproved: true, isOnline: true, disponivelUrgencias: true, isSuspended: false },
      }),
      prisma.filaUrgente.findMany({
        where: { aceitoEm: { not: null }, criadoEm: { gte: seteDiasAtras } },
        select: { criadoEm: true, aceitoEm: true },
      }),
      prisma.filaAgendada.findMany({
        where: { aceitoEm: { not: null }, criadoEm: { gte: seteDiasAtras } },
        select: { criadoEm: true, aceitoEm: true },
      }),
    ]);

    const esperaMaisAntigaMin = urgentesAguardando.length > 0
      ? Math.round((agora - new Date(urgentesAguardando[0].criadoEm)) / 60000)
      : 0;

    const avgMin = (rows) => {
      if (rows.length === 0) return null;
      const total = rows.reduce((s, r) => s + (new Date(r.aceitoEm) - new Date(r.criadoEm)), 0);
      return Math.round(total / rows.length / 60000);
    };

    return res.status(200).json({
      urgentes_aguardando:       urgentesAguardando.length,
      espera_mais_antiga_min:    esperaMaisAntigaMin,
      agendadas_aguardando_24h:  agendadasAguardando24h,
      em_atendimento_agora:      emAtendimentoAg + emAtendimentoUr,
      farmaceuticos_online:      farmaceuticosOnline,
      disponiveis_urgencia:      disponiveisUrgencia,
      expiradas_hoje:            expiradasHoje,
      tempo_medio_aceite_7d_min: {
        urgente:  avgMin(urgentesAceitas7d),
        agendada: avgMin(agendadasAceitas7d),
      },
    });
  } catch (err) {
    console.error('getFilaTempoReal error:', err);
    return res.status(500).json({ error: 'Erro ao buscar dados em tempo real.' });
  }
};

// ── GET /api/admin/avaliacoes?page=&limit=&nota=&farmaceuticoId=&de=&ate= ────

export const getAvaliacoesAdmin = async (req, res) => {
  const { page = '1', limit = '20', nota, farmaceuticoId, de, ate } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;

  const where = {};
  if (nota)           where.nota         = parseInt(nota, 10);
  if (farmaceuticoId) where.pharmacistId = farmaceuticoId;
  if (de || ate) {
    where.createdAt = {};
    if (de)  where.createdAt.gte = new Date(`${de}T00:00:00-03:00`);
    if (ate) where.createdAt.lte = new Date(`${ate}T23:59:59-03:00`);
  }

  try {
    const [total, avaliacoes] = await Promise.all([
      prisma.avaliacao.count({ where }),
      prisma.avaliacao.findMany({
        where,
        include: {
          paciente:   { select: { name: true } },
          pharmacist: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: limitNum,
      }),
    ]);

    const data = avaliacoes.map((a) => ({
      id:               a.id,
      data:             a.createdAt,
      nota:             a.nota,
      comentario:       a.comentario,
      pacienteNome:     a.paciente?.name ?? '—',
      farmaceuticoNome: a.pharmacist?.name ?? '—',
      farmaceuticoId:   a.pharmacistId,
      tipo:             a.filaAgendadaId ? 'agendada' : 'urgente',
      consultaId:       a.filaAgendadaId ?? a.filaUrgenteId,
    }));

    return res.status(200).json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    console.error('getAvaliacoesAdmin error:', err);
    return res.status(500).json({ error: 'Erro ao buscar avaliações.' });
  }
};

// ── GET /api/admin/avaliacoes/resumo?de=&ate= ────────────────────────────────

export const getResumoAvaliacoes = async (req, res) => {
  const { de, ate } = req.query;

  const where = {};
  if (de || ate) {
    where.createdAt = {};
    if (de)  where.createdAt.gte = new Date(`${de}T00:00:00-03:00`);
    if (ate) where.createdAt.lte = new Date(`${ate}T23:59:59-03:00`);
  }

  try {
    const [avaliacoesPeriodo, seisMeses] = await Promise.all([
      prisma.avaliacao.findMany({
        where,
        select: { nota: true, pharmacistId: true, pharmacist: { select: { name: true } } },
      }),
      (() => {
        const inicio = new Date();
        inicio.setMonth(inicio.getMonth() - 5);
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        return prisma.avaliacao.findMany({
          where: { createdAt: { gte: inicio } },
          select: { nota: true, createdAt: true },
        });
      })(),
    ]);

    const total = avaliacoesPeriodo.length;
    const soma  = avaliacoesPeriodo.reduce((s, a) => s + a.nota, 0);
    const media_geral = total > 0 ? Math.round((soma / total) * 10) / 10 : null;

    const distribuicao = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const a of avaliacoesPeriodo) distribuicao[String(a.nota)] = (distribuicao[String(a.nota)] ?? 0) + 1;

    // Evolução mensal — sempre os últimos 6 meses corridos, independente do filtro de/ate
    const inicio6m = new Date();
    inicio6m.setMonth(inicio6m.getMonth() - 5);
    inicio6m.setDate(1);
    inicio6m.setHours(0, 0, 0, 0);
    const mesesMap = {};
    for (let i = 0; i < 6; i++) {
      const d   = new Date(inicio6m.getFullYear(), inicio6m.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesMap[key] = { soma: 0, total: 0 };
    }
    for (const a of seisMeses) {
      const d   = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (mesesMap[key]) { mesesMap[key].soma += a.nota; mesesMap[key].total += 1; }
    }
    const evolucao_mensal = Object.entries(mesesMap).map(([mes, v]) => ({
      mes, media: v.total > 0 ? Math.round((v.soma / v.total) * 10) / 10 : null, total: v.total,
    }));

    // Ranking por farmacêutico — apenas quem tem ao menos 1 avaliação no período filtrado
    const farmMap = {};
    for (const a of avaliacoesPeriodo) {
      if (!a.pharmacistId) continue;
      if (!farmMap[a.pharmacistId]) {
        farmMap[a.pharmacistId] = { id: a.pharmacistId, nome: a.pharmacist?.name ?? '—', soma: 0, total: 0 };
      }
      farmMap[a.pharmacistId].soma += a.nota;
      farmMap[a.pharmacistId].total += 1;
    }
    const por_farmaceutico = Object.values(farmMap)
      .map((f) => ({ id: f.id, nome: f.nome, media: Math.round((f.soma / f.total) * 10) / 10, total: f.total }))
      .sort((a, b) => b.media - a.media);

    return res.status(200).json({ media_geral, total, distribuicao, evolucao_mensal, por_farmaceutico });
  } catch (err) {
    console.error('getResumoAvaliacoes error:', err);
    return res.status(500).json({ error: 'Erro ao buscar resumo de avaliações.' });
  }
};

// ── Gestão de administradores (SystemConfig 'admin_emails' + fallback env) ──

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEnvAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function getDbAdminEmails() {
  const row = await prisma.systemConfig.findUnique({ where: { key: 'admin_emails' } });
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed.map((e) => String(e).trim().toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export const listAdmins = async (req, res) => {
  try {
    const envEmails = getEnvAdminEmails();
    const dbEmails  = await getDbAdminEmails();
    const data = [
      ...envEmails.map((email) => ({ email, origem: 'env', removivel: false })),
      ...dbEmails
        .filter((email) => !envEmails.includes(email))
        .map((email) => ({ email, origem: 'config', removivel: true })),
    ];
    return res.status(200).json({ data });
  } catch (err) {
    console.error('listAdmins error:', err);
    return res.status(500).json({ error: 'Erro ao buscar administradores.' });
  }
};

export const addAdmin = async (req, res) => {
  const adminId = req.user?.id ?? 'admin';
  const email = (req.body.email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'E-mail inválido.' });

  try {
    const envEmails = getEnvAdminEmails();
    const dbEmails  = await getDbAdminEmails();
    if (envEmails.includes(email) || dbEmails.includes(email)) {
      return res.status(409).json({ error: 'Este e-mail já é administrador.' });
    }

    const updated = [...dbEmails, email];
    await prisma.systemConfig.upsert({
      where:  { key: 'admin_emails' },
      update: { value: JSON.stringify(updated) },
      create: { key: 'admin_emails', value: JSON.stringify(updated) },
    });
    invalidateAdminEmailsCache();

    await logAdminAction(prisma, {
      adminId, acao: 'adicionar_admin', alvoTipo: 'admin', alvoId: email, detalhes: { email },
    });
    return res.status(201).json({ email });
  } catch (err) {
    console.error('addAdmin error:', err);
    return res.status(500).json({ error: 'Erro ao adicionar administrador.' });
  }
};

export const removeAdmin = async (req, res) => {
  const adminId = req.user?.id ?? 'admin';
  const email = decodeURIComponent(req.params.email || '').trim().toLowerCase();
  const envEmails = getEnvAdminEmails();

  if (envEmails.includes(email)) {
    return res.status(403).json({ error: 'Este administrador é definido por variável de ambiente (ADMIN_EMAILS) e não pode ser removido pela interface.' });
  }
  if (email === (req.user?.email || '').toLowerCase()) {
    return res.status(403).json({ error: 'Você não pode remover seu próprio acesso de administrador.' });
  }

  try {
    const dbEmails = await getDbAdminEmails();
    const updated  = dbEmails.filter((e) => e !== email);
    await prisma.systemConfig.upsert({
      where:  { key: 'admin_emails' },
      update: { value: JSON.stringify(updated) },
      create: { key: 'admin_emails', value: JSON.stringify(updated) },
    });
    invalidateAdminEmailsCache();

    await logAdminAction(prisma, {
      adminId, acao: 'remover_admin', alvoTipo: 'admin', alvoId: email, detalhes: { email },
    });
    return res.status(200).json({ email });
  } catch (err) {
    console.error('removeAdmin error:', err);
    return res.status(500).json({ error: 'Erro ao remover administrador.' });
  }
};
