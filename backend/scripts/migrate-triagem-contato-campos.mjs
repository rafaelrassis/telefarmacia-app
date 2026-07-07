import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "triagem"          JSONB,
    ADD COLUMN IF NOT EXISTS "whatsapp_contato" TEXT,
    ADD COLUMN IF NOT EXISTS "modalidade_atend" TEXT,
    ADD COLUMN IF NOT EXISTS "sem_contato_log"  JSONB,
    ADD COLUMN IF NOT EXISTS "finalizacao"      JSONB;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "triagem"          JSONB,
    ADD COLUMN IF NOT EXISTS "whatsapp_contato" TEXT,
    ADD COLUMN IF NOT EXISTS "modalidade_atend" TEXT,
    ADD COLUMN IF NOT EXISTS "sem_contato_log"  JSONB,
    ADD COLUMN IF NOT EXISTS "finalizacao"      JSONB;
  `);
  console.log('✅ Colunas triagem/whatsapp_contato/modalidade_atend/sem_contato_log/finalizacao adicionadas em FilaAgendada e FilaUrgente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
