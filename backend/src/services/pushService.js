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

// Envia push a um único usuário (todas as subscriptions ativas dele).
// Nunca lança — falha de push nunca pode derrubar o fluxo que a disparou.
// IMPORTANTE (LGPD): payload deve conter apenas título/corpo genéricos e uma
// `url` de destino — nunca motivo, medicamentos, triagem ou outro dado clínico.
export async function sendPushToUser(userId, payload) {
  if (!vapidConfigured) return;
  try {
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
  } catch (err) {
    console.error('[pushService] sendPushToUser falhou:', err.message);
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

    await Promise.all(farmaceuticos.map((f) => sendPushToUser(f.userId, payload)));
  } catch (err) {
    console.error('[pushService] notifyFarmaceuticosUrgente falhou:', err.message);
  }
}

// ── Eventos do paciente ──────────────────────────────────────────────────────

export async function notifyConsultaAceita(pacienteId) {
  await sendPushToUser(pacienteId, {
    title: '✅ Consulta aceita',
    body:  'Um farmacêutico aceitou sua consulta.',
    url:   '/dashboard',
  });
}

export async function notifyLembreteConsulta(pacienteId, horaFormatada) {
  await sendPushToUser(pacienteId, {
    title: '⏰ Sua consulta é em breve',
    body:  `Sua consulta é às ${horaFormatada}.`,
    url:   '/dashboard',
  });
}

export async function notifyReceitaPronta(pacienteId) {
  await sendPushToUser(pacienteId, {
    title: '📄 Orientações disponíveis',
    body:  'Suas orientações estão disponíveis.',
    url:   '/dashboard',
  });
}

export async function notifyLembreteMedicacao(userId, medicamento, dose) {
  await sendPushToUser(userId, {
    title: '💊 Hora do medicamento',
    body:  dose ? `${medicamento} — ${dose}` : medicamento,
    url:   '/dashboard',
  });
}

export async function notifyEstorno(pacienteId) {
  await sendPushToUser(pacienteId, {
    title: '💰 Créditos devolvidos',
    body:  'Seus créditos foram devolvidos à sua carteira.',
    url:   '/dashboard',
  });
}
