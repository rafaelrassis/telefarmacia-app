-- AlterTable: PacienteProfile — adicionar onboardingConcluido
ALTER TABLE "PacienteProfile" ADD COLUMN "onboardingConcluido" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Notificacao
CREATE TABLE "Notificacao" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "tipo"       TEXT NOT NULL,
  "titulo"     TEXT NOT NULL,
  "mensagem"   TEXT NOT NULL,
  "lida"       BOOLEAN NOT NULL DEFAULT false,
  "criadoEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consultaId" TEXT,
  CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- Index para buscas por usuário
CREATE INDEX "Notificacao_userId_idx" ON "Notificacao"("userId");

-- FK: Notificacao -> User
ALTER TABLE "Notificacao"
  ADD CONSTRAINT "Notificacao_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
