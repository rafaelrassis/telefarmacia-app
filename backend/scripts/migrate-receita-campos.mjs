import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Adicionando colunas receita e receita_pdf_url...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "receita"          JSONB,
    ADD COLUMN IF NOT EXISTS "receita_pdf_url"  TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "receita"          JSONB,
    ADD COLUMN IF NOT EXISTS "receita_pdf_url"  TEXT;
  `);

  console.log('Colunas adicionadas com sucesso.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
