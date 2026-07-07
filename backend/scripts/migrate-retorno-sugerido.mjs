import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "retorno_sugerido"   JSONB,
    ADD COLUMN IF NOT EXISTS "retorno_dispensado" BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "retorno_sugerido"   JSONB,
    ADD COLUMN IF NOT EXISTS "retorno_dispensado" BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  console.log('✅ Colunas retorno_sugerido/retorno_dispensado adicionadas em FilaAgendada e FilaUrgente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
