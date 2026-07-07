import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/push/vapid-public-key
export const getVapidPublicKey = (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return res.status(404).json({ error: 'Push não configurado.' });
  }
  return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// POST /api/push/subscribe
export const subscribe = async (req, res) => {
  const userId = req.user.id;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Subscription inválida.' });
  }

  try {
    await prisma.pushSubscription.upsert({
      where:  { endpoint },
      update: { userId, keys },
      create: { userId, endpoint, keys },
    });
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('subscribe push error:', err);
    return res.status(500).json({ error: 'Erro ao registrar subscription.' });
  }
};

// DELETE /api/push/subscribe
export const unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint é obrigatório.' });

  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('unsubscribe push error:', err);
    return res.status(500).json({ error: 'Erro ao remover subscription.' });
  }
};
