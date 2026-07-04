import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Adicionando disponivel_urgencias em PharmacistProfile...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PharmacistProfile"
    ADD COLUMN IF NOT EXISTS "disponivel_urgencias" BOOLEAN NOT NULL DEFAULT true;
  `);

  console.log('Coluna adicionada. Execute: npx prisma generate');
}

main().catch(console.error).finally(() => prisma.$disconnect());
