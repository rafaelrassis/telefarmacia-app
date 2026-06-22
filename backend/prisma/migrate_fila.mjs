import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Criando tabelas: SistemaHorario, FilaAgendada, FilaUrgente, FarmaceuticoStatus...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SistemaHorario" (
      "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "diaSemana"  INTEGER NOT NULL,
      "horaInicio" TEXT NOT NULL DEFAULT '08:00',
      "horaFim"    TEXT NOT NULL DEFAULT '18:00',
      "ativo"      BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "SistemaHorario_diaSemana_key" UNIQUE ("diaSemana")
    )
  `);
  console.log('  ✓ SistemaHorario');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FilaAgendada" (
      "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "pacienteId"      TEXT NOT NULL,
      "dataHora"        TIMESTAMP(3) NOT NULL,
      "status"          TEXT NOT NULL DEFAULT 'aguardando',
      "farmaceuticoId"  TEXT,
      "creditoDebitado" DECIMAL(10,2) NOT NULL,
      "criadoEm"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FilaAgendada_pacienteId_fkey"
        FOREIGN KEY ("pacienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FilaAgendada_farmaceuticoId_fkey"
        FOREIGN KEY ("farmaceuticoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  console.log('  ✓ FilaAgendada');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FilaUrgente" (
      "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "pacienteId"      TEXT NOT NULL,
      "status"          TEXT NOT NULL DEFAULT 'aguardando',
      "farmaceuticoId"  TEXT,
      "creditoDebitado" DECIMAL(10,2) NOT NULL,
      "criadoEm"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "aceitoEm"        TIMESTAMP(3),
      CONSTRAINT "FilaUrgente_pacienteId_fkey"
        FOREIGN KEY ("pacienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FilaUrgente_farmaceuticoId_fkey"
        FOREIGN KEY ("farmaceuticoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  console.log('  ✓ FilaUrgente');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FarmaceuticoStatus" (
      "farmaceuticoId" TEXT NOT NULL PRIMARY KEY,
      "online"         BOOLEAN NOT NULL DEFAULT false,
      "ultimoPing"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FarmaceuticoStatus_farmaceuticoId_fkey"
        FOREIGN KEY ("farmaceuticoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  console.log('  ✓ FarmaceuticoStatus');

  console.log('\nMigração concluída! Agora execute: npx prisma generate');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
