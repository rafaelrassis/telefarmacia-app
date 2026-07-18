import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "LembreteMedicacao" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "pacienteId"      TEXT NOT NULL,
    "dependentId"     TEXT,
    "medicamento"     TEXT NOT NULL,
    "dose"            TEXT,
    "horarios"        TEXT[] NOT NULL,
    "ativo"           BOOLEAN NOT NULL DEFAULT TRUE,
    "ultimoDisparoEm" TIMESTAMP(3),
    "criadoEm"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LembreteMedicacao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LembreteMedicacao_pacienteId_fkey"
      FOREIGN KEY ("pacienteId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LembreteMedicacao_dependentId_fkey"
      FOREIGN KEY ("dependentId") REFERENCES "DependentProfile"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );
`);

await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "LembreteMedicacao_pacienteId_idx" ON "LembreteMedicacao"("pacienteId");
`);

console.log('✅ Tabela LembreteMedicacao criada (ou já existia).');
await prisma.$disconnect();
