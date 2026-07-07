import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "comissao_percentual" NUMERIC(5,2);
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "comissao_percentual" NUMERIC(5,2);
  `);
  console.log('✅ Coluna comissao_percentual adicionada em FilaAgendada e FilaUrgente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
