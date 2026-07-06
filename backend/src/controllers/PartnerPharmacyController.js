import { PrismaClient } from '@prisma/client';
import { logAdminAction } from '../utils/logAdminAction.js';

const prisma = new PrismaClient();

const CONFIG_KEY = 'onde_comprar_ativo';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildAffiliateUrl(pharmacy, produto) {
  if (produto && pharmacy.linkTemplate) {
    return pharmacy.linkTemplate
      .replace('{produto}', encodeURIComponent(produto))
      .replace('{code}', encodeURIComponent(pharmacy.affiliateCode));
  }
  const base = pharmacy.baseUrl.replace(/\/$/, '');
  const sep  = base.includes('?') ? '&' : '?';
  return `${base}${sep}aff=${encodeURIComponent(pharmacy.affiliateCode)}`;
}

// ── Admin: flag ───────────────────────────────────────────────────────────────

export const getOndeComprarConfig = async (req, res) => {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    return res.json({ ativo: row ? row.value === 'true' : false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar configuração.' });
  }
};

export const toggleOndeComprar = async (req, res) => {
  const { ativo } = req.body;
  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ error: 'ativo deve ser true ou false.' });
  }
  try {
    await prisma.systemConfig.upsert({
      where:  { key: CONFIG_KEY },
      update: { value: ativo ? 'true' : 'false' },
      create: { key: CONFIG_KEY, value: ativo ? 'true' : 'false' },
    });
    return res.json({ ativo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar configuração.' });
  }
};

// ── Admin: CRUD de parceiros ──────────────────────────────────────────────────

export const listParceiros = async (req, res) => {
  try {
    const parceiros = await prisma.partnerPharmacy.findMany({
      orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
    });
    return res.json(parceiros);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao listar parceiros.' });
  }
};

export const createParceiro = async (req, res) => {
  const { nome, logoUrl, baseUrl, affiliateCode, linkTemplate, ativo, ordem } = req.body;
  if (!nome?.trim())          return res.status(400).json({ error: 'nome é obrigatório.' });
  if (!baseUrl?.trim())       return res.status(400).json({ error: 'baseUrl é obrigatório.' });
  if (!affiliateCode?.trim()) return res.status(400).json({ error: 'affiliateCode é obrigatório.' });
  try {
    const parceiro = await prisma.partnerPharmacy.create({
      data: {
        nome:          nome.trim(),
        logoUrl:       logoUrl?.trim()       || null,
        baseUrl:       baseUrl.trim(),
        affiliateCode: affiliateCode.trim(),
        linkTemplate:  linkTemplate?.trim()  || null,
        ativo:         typeof ativo === 'boolean' ? ativo : true,
        ordem:         typeof ordem === 'number'  ? ordem : 0,
      },
    });
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'criar_parceiro', alvoTipo: 'parceiro', alvoId: parceiro.id,
      detalhes: { nome: parceiro.nome },
    });
    return res.status(201).json(parceiro);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar parceiro.' });
  }
};

export const updateParceiro = async (req, res) => {
  const { id } = req.params;
  const { nome, logoUrl, baseUrl, affiliateCode, linkTemplate, ativo, ordem } = req.body;
  try {
    const existing = await prisma.partnerPharmacy.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Parceiro não encontrado.' });

    const parceiro = await prisma.partnerPharmacy.update({
      where: { id },
      data: {
        ...(nome          !== undefined && { nome:          nome.trim() }),
        ...(logoUrl       !== undefined && { logoUrl:       logoUrl?.trim() || null }),
        ...(baseUrl       !== undefined && { baseUrl:       baseUrl.trim() }),
        ...(affiliateCode !== undefined && { affiliateCode: affiliateCode.trim() }),
        ...(linkTemplate  !== undefined && { linkTemplate:  linkTemplate?.trim() || null }),
        ...(typeof ativo  === 'boolean' && { ativo }),
        ...(typeof ordem  === 'number'  && { ordem }),
        updatedAt: new Date(),
      },
    });
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'atualizar_parceiro', alvoTipo: 'parceiro', alvoId: id,
    });
    return res.json(parceiro);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar parceiro.' });
  }
};

export const deleteParceiro = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.partnerPharmacy.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Parceiro não encontrado.' });
    await prisma.partnerPharmacy.delete({ where: { id } });
    await logAdminAction(prisma, {
      adminId: req.user?.id, acao: 'excluir_parceiro', alvoTipo: 'parceiro', alvoId: id,
      detalhes: { nome: existing.nome },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao excluir parceiro.' });
  }
};

// ── Admin: métricas agregadas ─────────────────────────────────────────────────

export const getMetricasParceiros = async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    const [parceiros, clicks] = await Promise.all([
      prisma.partnerPharmacy.findMany({
        select: { id: true, nome: true, ativo: true },
        orderBy: { ordem: 'asc' },
      }),
      prisma.affiliateClick.groupBy({
        by:     ['pharmacyId'],
        where:  { createdAt: { gte: since } },
        _count: { id: true },
      }),
    ]);

    const clickMap = {};
    for (const c of clicks) clickMap[c.pharmacyId] = c._count.id;

    const resultado = parceiros.map((p) => ({
      id:     p.id,
      nome:   p.nome,
      ativo:  p.ativo,
      clicks: clickMap[p.id] ?? 0,
    }));

    return res.json({ periodo: '30 dias', parceiros: resultado });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar métricas.' });
  }
};

// ── Paciente: listar parceiros ativos ─────────────────────────────────────────

export const getParceirosPaciente = async (req, res) => {
  try {
    const flagRow = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    const ativo   = flagRow ? flagRow.value === 'true' : false;

    if (!ativo) return res.json({ ativo: false, parceiros: [] });

    const parceiros = await prisma.partnerPharmacy.findMany({
      where:   { ativo: true },
      select:  { id: true, nome: true, logoUrl: true, linkTemplate: true },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
    });

    // affiliateCode nunca é retornado ao cliente
    return res.json({ ativo: true, parceiros });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar parceiros.' });
  }
};

// ── Paciente: registrar clique (server-side URL build) ────────────────────────

export const registrarClique = async (req, res) => {
  const { id: pharmacyId } = req.params;
  const { consultaId, produto, tipo } = req.body;

  try {
    const pharmacy = await prisma.partnerPharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy || !pharmacy.ativo) {
      return res.status(404).json({ error: 'Parceiro não encontrado.' });
    }

    // Grava clique com apenas pharmacyId + consultaId — sem dado pessoal do paciente
    await prisma.affiliateClick.create({
      data: {
        pharmacyId,
        consultaId: consultaId || null,
      },
    });

    // Constrói URL server-side — affiliateCode nunca vai ao cliente como campo
    const usarTemplate = tipo === 'mip' && produto?.trim() && pharmacy.linkTemplate;
    const url = buildAffiliateUrl(pharmacy, usarTemplate ? produto.trim() : null);

    return res.json({ url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao registrar clique.' });
  }
};
