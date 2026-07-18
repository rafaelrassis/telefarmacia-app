import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "iniciadoEm"  TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "concluidoEm" TIMESTAMP(3);
`);

await prisma.$executeRawUnsafe(`
  ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "iniciadoEm"  TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "concluidoEm" TIMESTAMP(3);
`);

console.log('✅ Colunas iniciadoEm/concluidoEm adicionadas em FilaAgendada e FilaUrgente (ou já existiam).');
await prisma.$disconnect();
