import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contato@telefarmacia.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

async function sendToUser(userId, payload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload),
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error('[pushService] falha ao enviar push:', err.message);
      }
    }
  }
}

export async function notifyFarmaceuticosUrgente(fila) {
  if (!vapidConfigured) return;
  try {
    const farmaceuticos = await prisma.pharmacistProfile.findMany({
      where: { isApproved: true, isSuspended: false, disponivelUrgencias: true },
      select: { userId: true },
    });

    const motivo = fila?.motivo ? String(fila.motivo).slice(0, 80) : 'Novo paciente aguardando atendimento.';
    const payload = {
      title: '🚨 Nova consulta urgente',
      body:  motivo,
      url:   '/dashboard',
    };

    await Promise.all(farmaceuticos.map((f) => sendToUser(f.userId, payload)));
  } catch (err) {
    console.error('[pushService] notifyFarmaceuticosUrgente falhou:', err.message);
  }
}
