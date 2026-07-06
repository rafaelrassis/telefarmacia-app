import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "Repasse" (
    "id"                   TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "pharmacistId"         TEXT        NOT NULL,
    "adminId"              TEXT        NOT NULL,
    "referenciaTransacao"  TEXT,
    "valorTotal"           NUMERIC(10,2) NOT NULL,
    "periodoInicio"        TIMESTAMP(3)  NOT NULL,
    "periodoFim"           TIMESTAMP(3)  NOT NULL,
    "criadoEm"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Repasse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Repasse_pharmacistId_fkey"
      FOREIGN KEY ("pharmacistId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  );
`);

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "RepasseItem" (
    "id"           TEXT          NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "repasseId"    TEXT          NOT NULL,
    "consultaId"   TEXT          NOT NULL,
    "consultaTipo" TEXT          NOT NULL,
    "valorBruto"   NUMERIC(10,2) NOT NULL,
    "percentual"   NUMERIC(5,2)  NOT NULL,
    "valorLiquido" NUMERIC(10,2) NOT NULL,
    CONSTRAINT "RepasseItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RepasseItem_repasseId_fkey"
      FOREIGN KEY ("repasseId") REFERENCES "Repasse"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepasseItem_consultaId_consultaTipo_key"
      UNIQUE ("consultaId", "consultaTipo")
  );
`);

console.log('✅ Tabelas Repasse e RepasseItem criadas (ou já existiam).');
await prisma.$disconnect();
