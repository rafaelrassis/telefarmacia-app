import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generatePixCharge = async (req, res) => {
  const { appointmentId } = req.body;

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado.' });
  if (appointment.patientId !== req.user.id) return res.status(403).json({ error: 'Acesso negado.' });

  const pixId = `pix_${appointmentId}`;
  await prisma.appointment.update({ where: { id: appointmentId }, data: { pixId } });

  const pixData = {
    pixCopiaECola: `00020126580014br.gov.bcb.pix0136${pixId}5204000053039865802BR5913Telefarmacia`,
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=mockPixData',
  };

  return res.status(200).json(pixData);
};

export const handleWebhook = async (req, res) => {
  const incomingSecret = req.headers['x-webhook-secret'];
  if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Webhook não autorizado.' });
  }

  const { appointmentId } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });

    if (!appointment || appointment.status !== 'PENDENTE_PAGAMENTO') {
      return res.status(400).json({ error: 'Agendamento inválido ou já processado.' });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'AGENDADO' },
    });

    return res.status(200).json({ success: true, message: 'Pagamento confirmado. Consulta agendada.' });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({ error: 'Falha no processamento do pagamento.' });
  }
};
