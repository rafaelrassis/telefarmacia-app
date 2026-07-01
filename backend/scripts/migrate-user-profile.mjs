import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS phone TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT`);
  console.log('Migration user-profile: colunas phone e photoUrl adicionadas.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
