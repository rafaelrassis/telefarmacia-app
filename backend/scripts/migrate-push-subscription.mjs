import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "userId"    TEXT NOT NULL,
      "endpoint"  TEXT NOT NULL,
      "keys"      JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint"),
      CONSTRAINT "PushSubscription_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription" ("userId");`
  );
  console.log('✅ Tabela PushSubscription criada (ou já existia).');
}

main().catch(console.error).finally(() => prisma.$disconnect());
