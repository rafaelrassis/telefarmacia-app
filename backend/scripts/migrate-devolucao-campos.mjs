import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "devolucoes" JSONB;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "devolucoes" JSONB;
  `);
  console.log('Coluna devolucoes adicionada a FilaAgendada e FilaUrgente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
