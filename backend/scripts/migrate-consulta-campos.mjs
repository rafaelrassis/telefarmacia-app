import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Adicionando colunas motivo e observacoes em FilaAgendada e FilaUrgente...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "motivo"      TEXT,
    ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "motivo"      TEXT,
    ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
  `);

  console.log('Colunas adicionadas com sucesso.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
