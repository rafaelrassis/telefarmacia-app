-- AlterTable: Avaliacao — tornar appointmentId e pharmacistId opcionais, adicionar fila IDs
ALTER TABLE "Avaliacao" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "Avaliacao" ALTER COLUMN "pharmacistId" DROP NOT NULL;

-- AddColumn: filaAgendadaId e filaUrgenteId em Avaliacao
ALTER TABLE "Avaliacao" ADD COLUMN "filaAgendadaId" TEXT;
ALTER TABLE "Avaliacao" ADD COLUMN "filaUrgenteId"  TEXT;

-- UniqueIndex para os novos campos
CREATE UNIQUE INDEX "Avaliacao_filaAgendadaId_key" ON "Avaliacao"("filaAgendadaId");
CREATE UNIQUE INDEX "Avaliacao_filaUrgenteId_key"  ON "Avaliacao"("filaUrgenteId");

-- FK constraints para os novos campos
ALTER TABLE "Avaliacao"
  ADD CONSTRAINT "Avaliacao_filaAgendadaId_fkey"
  FOREIGN KEY ("filaAgendadaId") REFERENCES "FilaAgendada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Avaliacao"
  ADD CONSTRAINT "Avaliacao_filaUrgenteId_fkey"
  FOREIGN KEY ("filaUrgenteId") REFERENCES "FilaUrgente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Atualizar FK de pharmacistId para SET NULL (era CASCADE implícito via User)
ALTER TABLE "Avaliacao" DROP CONSTRAINT IF EXISTS "Avaliacao_pharmacistId_fkey";
ALTER TABLE "Avaliacao"
  ADD CONSTRAINT "Avaliacao_pharmacistId_fkey"
  FOREIGN KEY ("pharmacistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: TransacaoCarteira
CREATE TABLE "TransacaoCarteira" (
  "id"         TEXT NOT NULL,
  "carteiraId" TEXT NOT NULL,
  "tipo"       TEXT NOT NULL,
  "valor"      DECIMAL(10,2) NOT NULL,
  "saldoApos"  DECIMAL(10,2) NOT NULL,
  "descricao"  TEXT NOT NULL,
  "consultaId" TEXT,
  "criadoEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransacaoCarteira_pkey" PRIMARY KEY ("id")
);

-- FK: TransacaoCarteira -> Carteira
ALTER TABLE "TransacaoCarteira"
  ADD CONSTRAINT "TransacaoCarteira_carteiraId_fkey"
  FOREIGN KEY ("carteiraId") REFERENCES "Carteira"("id") ON DELETE CASCADE ON UPDATE CASCADE;
