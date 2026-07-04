import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "ConviteFarmaceutico" (
    "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "email"     TEXT        NOT NULL,
    "nome"      TEXT        NOT NULL,
    "token"     TEXT        NOT NULL,
    "usado"     BOOLEAN     NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "criadoEm"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId"   TEXT        NOT NULL,
    CONSTRAINT "ConviteFarmaceutico_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConviteFarmaceutico_token_key" UNIQUE ("token")
  );
`);

console.log('✅ Tabela ConviteFarmaceutico criada (ou já existia).');
await prisma.$disconnect();
