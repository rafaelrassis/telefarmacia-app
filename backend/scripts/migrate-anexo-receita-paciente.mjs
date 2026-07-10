import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "anexo_receita_url" TEXT
`);

await prisma.$executeRawUnsafe(`
  ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "anexo_receita_url" TEXT
`);

console.log('✅ Coluna anexo_receita_url adicionada em FilaAgendada e FilaUrgente.');

await prisma.$disconnect();
