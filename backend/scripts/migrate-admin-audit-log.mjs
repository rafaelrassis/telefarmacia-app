import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "adminId"   TEXT NOT NULL,
    "acao"      TEXT NOT NULL,
    "alvoTipo"  TEXT,
    "alvoId"    TEXT,
    "detalhes"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminAuditLog_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog" ("adminId", "createdAt");
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "AdminAuditLog_alvoTipo_alvoId_idx" ON "AdminAuditLog" ("alvoTipo", "alvoId");
`);

console.log('✅ Tabela AdminAuditLog criada (ou já existia).');
await prisma.$disconnect();
