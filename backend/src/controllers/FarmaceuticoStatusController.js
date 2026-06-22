import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/farmaceutico/ping
export const ping = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') {
    return res.status(403).json({ error: 'Acesso restrito a farmacêuticos.' });
  }
  const farmaceuticoId = req.user.id;

  try {
    await prisma.farmaceuticoStatus.upsert({
      where:  { farmaceuticoId },
      update: { online: true, ultimoPing: new Date() },
      create: { farmaceuticoId, online: true, ultimoPing: new Date() },
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao registrar presença.' });
  }
};
