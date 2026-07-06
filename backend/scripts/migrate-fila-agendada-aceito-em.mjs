import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  ALTER TABLE "FilaAgendada" ADD COLUMN IF NOT EXISTS "aceitoEm" TIMESTAMP(3);
`);

console.log('✅ Coluna FilaAgendada.aceitoEm adicionada (ou já existia).');
await prisma.$disconnect();
