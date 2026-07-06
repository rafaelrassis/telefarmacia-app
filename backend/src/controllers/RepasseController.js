import { PrismaClient } from '@prisma/client';
import { logAction } from '../utils/logAction.js';
import { logAdminAction } from '../utils/logAdminAction.js';

const prisma = new PrismaClient();

// ── GET /api/admin/repasses/preview?pharmacistId=&de=&ate= ──────────────────
// Retorna consultas concluídas no período sem RepasseItem — para pré-visualizar

export const previewRepasse = async (req, res) => {
  const { pharmacistId, de, ate } = req.query;
  if (!pharmacistId || !de || !ate) {
    return res.status(400).json({ error: 'pharmacistId, de e ate são obrigatórios.' });
  }

  const deDate  = new Date(`${de}T00:00:00-03:00`);
  const ateDate = new Date(`${ate}T23:59:59-03:00`);

  try {
    const [farmaceutico, comissaoRow, comissaoInd, agendadas, urgentes] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: pharmacistId },
        select: { name: true, email: true, pharmacistProfile: { select: { chavePix: true } } },
      }),
      prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
      prisma.$queryRawUnsafe(
        `SELECT CAST(percentual AS FLOAT) AS percentual FROM comissoes_individuais WHERE farmaceutico_id = $1`,
        pharmacistId
      ).catch(() => []),
      // Agendadas concluídas no período sem RepasseItem
      prisma.$queryRawUnsafe(
        `SELECT fa.id, fa."creditoDebitado"::float AS valor, fa."dataHora" AS data,
                u.name AS paciente
         FROM "FilaAgendada" fa
         JOIN "User" u ON u.id = fa."pacienteId"
         LEFT JOIN "RepasseItem" ri ON ri."consultaId" = fa.id AND ri."consultaTipo" = 'agendada'
         WHERE fa."farmaceuticoId" = $1
           AND fa.status = 'concluido'
           AND fa."dataHora" BETWEEN $2 AND $3
           AND ri.id IS NULL
         ORDER BY fa."dataHora" DESC`,
        pharmacistId, deDate, ateDate
      ),
      // Urgentes concluídas no período sem RepasseItem
      prisma.$queryRawUnsafe(
        `SELECT fu.id, fu."creditoDebitado"::float AS valor, fu."criadoEm" AS data,
                u.name AS paciente
         FROM "FilaUrgente" fu
         JOIN "User" u ON u.id = fu."pacienteId"
         LEFT JOIN "RepasseItem" ri ON ri."consultaId" = fu.id AND ri."consultaTipo" = 'urgente'
         WHERE fu."farmaceuticoId" = $1
           AND fu.status = 'concluido'
           AND fu."criadoEm" BETWEEN $2 AND $3
           AND ri.id IS NULL
         ORDER BY fu."criadoEm" DESC`,
        pharmacistId, deDate, ateDate
      ),
    ]);

    if (!farmaceutico) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });

    const percentual = comissaoInd[0]?.percentual ?? parseFloat(comissaoRow?.value ?? '70');

    const items = [
      ...agendadas.map((r) => ({ id: r.id, tipo: 'agendada', data: r.data, paciente: r.paciente, valorBruto: Number(r.valor), valorLiquido: Math.round(Number(r.valor) * (percentual / 100) * 100) / 100 })),
      ...urgentes.map((r) => ({ id: r.id, tipo: 'urgente',   data: r.data, paciente: r.paciente, valorBruto: Number(r.valor), valorLiquido: Math.round(Number(r.valor) * (percentual / 100) * 100) / 100 })),
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    const valorTotal = Math.round(items.reduce((s, i) => s + i.valorLiquido, 0) * 100) / 100;

    return res.status(200).json({
      farmaceutico: {
        id:       pharmacistId,
        nome:     farmaceutico.name,
        email:    farmaceutico.email,
        chavePix: farmaceutico.pharmacistProfile?.chavePix ?? null,
      },
      percentual,
      periodoInicio: deDate,
      periodoFim:    ateDate,
      items,
      valorTotal,
    });
  } catch (err) {
    console.error('previewRepasse error:', err);
    return res.status(500).json({ error: 'Erro ao pré-visualizar repasse.' });
  }
};

// ── POST /api/admin/repasses ─────────────────────────────────────────────────
// Cria o repasse, marcando todas as consultas pendentes no período como pagas

export const registrarRepasse = async (req, res) => {
  const { pharmacistId, de, ate, referenciaTransacao } = req.body;
  if (!pharmacistId || !de || !ate) {
    return res.status(400).json({ error: 'pharmacistId, de e ate são obrigatórios.' });
  }

  const deDate  = new Date(`${de}T00:00:00-03:00`);
  const ateDate = new Date(`${ate}T23:59:59-03:00`);
  const adminId = req.user?.id ?? 'admin';

  try {
    const [comissaoRow, comissaoInd, agendadas, urgentes] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
      prisma.$queryRawUnsafe(
        `SELECT CAST(percentual AS FLOAT) AS percentual FROM comissoes_individuais WHERE farmaceutico_id = $1`,
        pharmacistId
      ).catch(() => []),
      prisma.$queryRawUnsafe(
        `SELECT fa.id, fa."creditoDebitado"::float AS valor
         FROM "FilaAgendada" fa
         LEFT JOIN "RepasseItem" ri ON ri."consultaId" = fa.id AND ri."consultaTipo" = 'agendada'
         WHERE fa."farmaceuticoId" = $1 AND fa.status = 'concluido'
           AND fa."dataHora" BETWEEN $2 AND $3 AND ri.id IS NULL`,
        pharmacistId, deDate, ateDate
      ),
      prisma.$queryRawUnsafe(
        `SELECT fu.id, fu."creditoDebitado"::float AS valor
         FROM "FilaUrgente" fu
         LEFT JOIN "RepasseItem" ri ON ri."consultaId" = fu.id AND ri."consultaTipo" = 'urgente'
         WHERE fu."farmaceuticoId" = $1 AND fu.status = 'concluido'
           AND fu."criadoEm" BETWEEN $2 AND $3 AND ri.id IS NULL`,
        pharmacistId, deDate, ateDate
      ),
    ]);

    const percentual = comissaoInd[0]?.percentual ?? parseFloat(comissaoRow?.value ?? '70');

    const allPending = [
      ...agendadas.map((r) => ({ id: r.id, tipo: 'agendada', valor: Number(r.valor) })),
      ...urgentes.map((r) => ({ id: r.id, tipo: 'urgente',   valor: Number(r.valor) })),
    ];

    if (allPending.length === 0) {
      return res.status(400).json({ error: 'Nenhuma consulta pendente de repasse no período informado.' });
    }

    const valorTotal = Math.round(allPending.reduce((s, i) => s + i.valor * (percentual / 100), 0) * 100) / 100;

    const repasse = await prisma.$transaction(async (tx) => {
      const r = await tx.repasse.create({
        data: {
          pharmacistId,
          adminId,
          referenciaTransacao: referenciaTransacao?.trim() || null,
          valorTotal,
          periodoInicio: deDate,
          periodoFim:    ateDate,
        },
      });

      await tx.repasseItem.createMany({
        data: allPending.map((item) => ({
          repasseId:    r.id,
          consultaId:   item.id,
          consultaTipo: item.tipo,
          valorBruto:   item.valor,
          percentual,
          valorLiquido: Math.round(item.valor * (percentual / 100) * 100) / 100,
        })),
      });

      return r;
    });

    await logAction(prisma, {
      consultaId: null,
      usuarioId:  adminId,
      role:       'ADMIN',
      acao:       'repasse_registrado',
      detalhes:   { repasseId: repasse.id, pharmacistId, valorTotal, itens: allPending.length, referenciaTransacao: referenciaTransacao?.trim() || null },
    });
    await logAdminAction(prisma, {
      adminId, acao: 'registrar_repasse', alvoTipo: 'farmaceutico', alvoId: pharmacistId,
      detalhes: { repasseId: repasse.id, valorTotal, itens: allPending.length },
    });

    return res.status(201).json({ ...repasse, itensCount: allPending.length });
  } catch (err) {
    console.error('registrarRepasse error:', err);
    return res.status(500).json({ error: 'Erro ao registrar repasse.' });
  }
};

// ── GET /api/admin/repasses?pharmacistId=&page= ──────────────────────────────

export const listarRepasses = async (req, res) => {
  const { pharmacistId } = req.query;
  const page  = Math.max(1, parseInt(req.query.page ?? '1'));
  const limit = 20;
  const skip  = (page - 1) * limit;

  try {
    const where = pharmacistId ? { pharmacistId } : {};

    const [repasses, total] = await Promise.all([
      prisma.repasse.findMany({
        where,
        include: { pharmacist: { select: { name: true, email: true } }, itens: true },
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
      }),
      prisma.repasse.count({ where }),
    ]);

    return res.status(200).json({
      items:   repasses.map((r) => ({ ...r, itensCount: r.itens.length })),
      total,
      page,
      hasMore: skip + limit < total,
    });
  } catch (err) {
    console.error('listarRepasses error:', err);
    return res.status(500).json({ error: 'Erro ao listar repasses.' });
  }
};

// ── GET /api/admin/repasses/export?pharmacistId= ─────────────────────────────

export const exportRepasses = async (req, res) => {
  const { pharmacistId } = req.query;
  try {
    const where = pharmacistId ? { pharmacistId } : {};
    const repasses = await prisma.repasse.findMany({
      where,
      include: { pharmacist: { select: { name: true, email: true } }, itens: true },
      orderBy: { criadoEm: 'desc' },
    });

    const fmtDec = (n) => Number(n).toFixed(2).replace('.', ',');
    const header = 'Data;Farmacêutico;E-mail;Período Início;Período Fim;Qtd. Consultas;Valor Total;Referência\n';
    const csvRows = repasses.map((r) => {
      const dt = new Date(r.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const pi = new Date(r.periodoInicio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const pf = new Date(r.periodoFim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      return [
        `"${dt}"`, `"${r.pharmacist?.name ?? '—'}"`, `"${r.pharmacist?.email ?? ''}"`,
        `"${pi}"`, `"${pf}"`, r.itens.length, fmtDec(r.valorTotal), `"${r.referenciaTransacao ?? ''}"`,
      ].join(';');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="repasses-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send('﻿' + header + csvRows.join('\n'));
  } catch (err) {
    console.error('exportRepasses error:', err);
    return res.status(500).json({ error: 'Erro ao exportar repasses.' });
  }
};
