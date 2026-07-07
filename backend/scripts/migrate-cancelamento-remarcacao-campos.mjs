import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaAgendada"
    ADD COLUMN IF NOT EXISTS "motivo_cancelamento"    TEXT,
    ADD COLUMN IF NOT EXISTS "remarcacoes"             INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "remarcacao_pendente"      JSONB,
    ADD COLUMN IF NOT EXISTS "encaminhamento_detalhe"   TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FilaUrgente"
    ADD COLUMN IF NOT EXISTS "motivo_cancelamento"    TEXT,
    ADD COLUMN IF NOT EXISTS "remarcacoes"             INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "remarcacao_pendente"      JSONB,
    ADD COLUMN IF NOT EXISTS "encaminhamento_detalhe"   TEXT;
  `);
  console.log('✅ Colunas motivo_cancelamento/remarcacoes/remarcacao_pendente/encaminhamento_detalhe adicionadas em FilaAgendada e FilaUrgente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
