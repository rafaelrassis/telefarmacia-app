import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "encaminhamento_pdf_url" TEXT
`);

await prisma.$executeRawUnsafe(`
  ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "encaminhamento_pdf_url" TEXT
`);

console.log('✅ Colunas encaminhamento_pdf_url adicionadas em FilaAgendada e FilaUrgente.');

await prisma.$disconnect();
