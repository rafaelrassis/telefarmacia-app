import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { logAdminAction } from '../utils/logAdminAction.js';

const prisma = new PrismaClient();

// ── GET /api/admin/convites ──────────────────────────────────────────────────

export const listarConvites = async (req, res) => {
  try {
    const convites = await prisma.conviteFarmaceutico.findMany({
      orderBy: { criadoEm: 'desc' },
    });

    const agora = new Date();
    const result = convites.map((c) => ({
      ...c,
      status: c.usado ? 'usado' : c.expiresAt < agora ? 'expirado' : 'pendente',
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('listarConvites error:', err);
    return res.status(500).json({ error: 'Erro ao listar convites.' });
  }
};

// ── POST /api/admin/convites ─────────────────────────────────────────────────

export const criarConvite = async (req, res) => {
  const { email, nome } = req.body;
  if (!email?.trim() || !nome?.trim()) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const adminId = req.user?.id ?? 'admin';

  try {
    // Verifica convite pendente já existente para o e-mail
    const agora = new Date();
    const pendente = await prisma.conviteFarmaceutico.findFirst({
      where: { email: email.trim().toLowerCase(), usado: false, expiresAt: { gt: agora } },
    });
    if (pendente) {
      return res.status(409).json({ error: 'Já existe um convite pendente para este e-mail.' });
    }

    const token     = randomUUID();
    const expiresAt = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

    const convite = await prisma.conviteFarmaceutico.create({
      data: {
        email:     email.trim().toLowerCase(),
        nome:      nome.trim(),
        token,
        expiresAt,
        adminId,
      },
    });

    await logAdminAction(prisma, {
      adminId, acao: 'criar_convite_farmaceutico', alvoTipo: 'convite', alvoId: convite.id,
      detalhes: { email: convite.email, nome: convite.nome },
    });

    return res.status(201).json({
      convite,
      link: `/convite/${token}`,
    });
  } catch (err) {
    console.error('criarConvite error:', err);
    return res.status(500).json({ error: 'Erro ao criar convite.' });
  }
};

// ── DELETE /api/admin/convites/:id ───────────────────────────────────────────

export const revogarConvite = async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id ?? 'admin';
  try {
    const convite = await prisma.conviteFarmaceutico.findUnique({ where: { id } });
    if (!convite) return res.status(404).json({ error: 'Convite não encontrado.' });
    if (convite.usado) return res.status(400).json({ error: 'Convite já utilizado, não pode ser revogado.' });

    await prisma.conviteFarmaceutico.delete({ where: { id } });
    await logAdminAction(prisma, {
      adminId, acao: 'revogar_convite_farmaceutico', alvoTipo: 'convite', alvoId: id,
      detalhes: { email: convite.email, nome: convite.nome },
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('revogarConvite error:', err);
    return res.status(500).json({ error: 'Erro ao revogar convite.' });
  }
};
