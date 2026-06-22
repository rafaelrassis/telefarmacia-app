import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const initCronJobs = () => {
  // A cada hora: AGENDADO cujo horário já passou → EXPIRADA
  cron.schedule('0 * * * *', async () => {
    try {
      const { count } = await prisma.appointment.updateMany({
        where: { status: 'AGENDADO', dateTime: { lt: new Date() } },
        data: { status: 'EXPIRADA' },
      });
      if (count > 0) {
        console.log(`[cron] ${count} consulta(s) marcada(s) como EXPIRADA.`);
      }
    } catch (err) {
      console.error('[cron] Erro ao expirar consultas:', err.message);
    }
  });

  console.log('[cron] Jobs iniciados (expiração a cada hora).');
};
