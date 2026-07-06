import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "BloqueioAgenda" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "pharmacistId" TEXT NOT NULL,
    "dataInicio"   TIMESTAMP(3) NOT NULL,
    "dataFim"      TIMESTAMP(3) NOT NULL,
    "motivo"       TEXT,
    "criadoEm"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BloqueioAgenda_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BloqueioAgenda_pharmacistId_fkey"
      FOREIGN KEY ("pharmacistId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`);

console.log('✅ Tabela BloqueioAgenda criada (ou já existia).');
await prisma.$disconnect();
