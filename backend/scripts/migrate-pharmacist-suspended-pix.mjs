import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.$executeRawUnsafe(`
  ALTER TABLE "PharmacistProfile"
    ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "chavePix"    TEXT;
`);

console.log('✅ Campos isSuspended e chavePix adicionados ao PharmacistProfile.');
await prisma.$disconnect();
