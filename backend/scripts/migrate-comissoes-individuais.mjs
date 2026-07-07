import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS comissoes_individuais (
      farmaceutico_id TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
      percentual      NUMERIC(5,2) NOT NULL,
      atualizado_em   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Tabela comissoes_individuais criada (ou já existia).');
}

main().catch(console.error).finally(() => prisma.$disconnect());
