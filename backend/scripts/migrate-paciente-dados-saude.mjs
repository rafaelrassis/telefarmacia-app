import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PacienteProfile"
    ADD COLUMN IF NOT EXISTS "dados_saude" JSONB;
  `);
  console.log('✅ Coluna dados_saude adicionada em PacienteProfile.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
