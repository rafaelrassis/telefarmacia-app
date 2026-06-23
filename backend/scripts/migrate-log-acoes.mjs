import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS log_acoes (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      consulta_id TEXT,
      usuario_id  TEXT,
      role        TEXT,
      acao        TEXT        NOT NULL,
      detalhes    JSONB,
      criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_log_acao        ON log_acoes (acao);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_log_consulta_id ON log_acoes (consulta_id);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_log_criado_em   ON log_acoes (criado_em DESC);`
  );
  console.log('Tabela log_acoes criada com sucesso.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
