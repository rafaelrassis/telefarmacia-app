import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "lembrete_enviado" BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  console.log('✅ Coluna lembrete_enviado adicionada em FilaAgendada.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
