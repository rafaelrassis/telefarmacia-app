import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { beforeEach, afterAll } from 'vitest';
import { assertTestDatabase } from './_guard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.test') });
process.env.NODE_ENV = 'test';

// Segunda camada do guard (a primeira roda uma vez no globalSetup) — barato
// e garante que nenhum arquivo de teste rode isolado contra o banco errado.
assertTestDatabase();

const { prisma } = await import('./db.js');

async function truncateAll() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);
  const names = tables.map((t) => `"${t.tablename}"`).join(', ');
  if (names) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE;`);
  }
}

// Seed mínimo para que nenhum teste dependa da hora/dia em que roda: sistema
// aberto 24/7 e preços/comissão previsíveis. Testes que precisam de um
// horário FORA do expediente (ex.: validar bloqueio) ajustam localmente.
async function seedBase() {
  await prisma.systemConfig.createMany({
    data: [
      { key: 'preco_consulta', value: '50' },
      { key: 'comissao_padrao', value: '70' },
      { key: 'sistema_aberto', value: 'true' },
      { key: 'max_urgencias_simultaneas', value: '1' },
      { key: 'tolerancia_expiracao_agendada_min', value: '30' },
      { key: 'urgente_max_aguardando_min', value: '15' },
      { key: 'urgente_max_aceito_alerta_min', value: '30' },
      { key: 'urgente_max_aceito_cancelar_min', value: '60' },
      { key: 'atendimento_max_duracao_h', value: '4' },
    ],
    skipDuplicates: true,
  });

  await prisma.sistemaHorario.createMany({
    data: Array.from({ length: 7 }, (_, diaSemana) => ({
      diaSemana, horaInicio: '00:00', horaFim: '23:59', ativo: true,
    })),
    skipDuplicates: true,
  });
}

beforeEach(async () => {
  await truncateAll();
  await seedBase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
