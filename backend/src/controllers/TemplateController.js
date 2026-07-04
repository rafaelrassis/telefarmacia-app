import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── GET /api/farmaceutico/templates ─────────────────────────────────────────

export const listarTemplates = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  try {
    const templates = await prisma.templateOrientacao.findMany({
      where:   { pharmacistId: req.user.id },
      orderBy: { titulo: 'asc' },
      select:  { id: true, titulo: true, conteudo: true, criadoEm: true, atualizadoEm: true },
    });
    return res.status(200).json(templates);
  } catch (err) {
    console.error('listarTemplates error:', err);
    return res.status(500).json({ error: 'Erro ao buscar templates.' });
  }
};

// ── POST /api/farmaceutico/templates ────────────────────────────────────────

export const criarTemplate = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { titulo, conteudo } = req.body;
  if (!titulo?.trim() || !conteudo?.trim()) {
    return res.status(400).json({ error: 'titulo e conteudo são obrigatórios.' });
  }
  try {
    const template = await prisma.templateOrientacao.create({
      data: { pharmacistId: req.user.id, titulo: titulo.trim(), conteudo: conteudo.trim() },
    });
    return res.status(201).json(template);
  } catch (err) {
    console.error('criarTemplate error:', err);
    return res.status(500).json({ error: 'Erro ao criar template.' });
  }
};

// ── PUT /api/farmaceutico/templates/:id ─────────────────────────────────────

export const atualizarTemplate = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { titulo, conteudo } = req.body;
  if (!titulo?.trim() || !conteudo?.trim()) {
    return res.status(400).json({ error: 'titulo e conteudo são obrigatórios.' });
  }
  try {
    const existing = await prisma.templateOrientacao.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template não encontrado.' });
    if (existing.pharmacistId !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

    const updated = await prisma.templateOrientacao.update({
      where: { id },
      data:  { titulo: titulo.trim(), conteudo: conteudo.trim() },
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('atualizarTemplate error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar template.' });
  }
};

// ── DELETE /api/farmaceutico/templates/:id ───────────────────────────────────

export const excluirTemplate = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  try {
    const existing = await prisma.templateOrientacao.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template não encontrado.' });
    if (existing.pharmacistId !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

    await prisma.templateOrientacao.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('excluirTemplate error:', err);
    return res.status(500).json({ error: 'Erro ao excluir template.' });
  }
};
