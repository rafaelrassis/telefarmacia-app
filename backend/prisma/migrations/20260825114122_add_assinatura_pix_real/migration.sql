-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "mpPaymentId" TEXT;

-- CreateTable
CREATE TABLE "Plano" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Plano Mensal',
    "preco" DECIMAL(10,2) NOT NULL,
    "consultasIncluidas" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "mpPreapprovalId" TEXT,
    "consultasUsadasNoMes" INTEGER NOT NULL DEFAULT 0,
    "cicloAtualInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cicloAtualFim" TIMESTAMP(3) NOT NULL,
    "emTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialFim" TIMESTAMP(3),
    "descontoTrialPercentual" DECIMAL(5,2),
    "canceladaEm" TIMESTAMP(3),
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoTrial" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT NOT NULL DEFAULT 'dias_gratis',
    "dias" INTEGER NOT NULL DEFAULT 7,
    "percentual" DECIMAL(5,2),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoTrial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_mpPreapprovalId_key" ON "Assinatura"("mpPreapprovalId");

-- CreateIndex
CREATE INDEX "Assinatura_pacienteId_idx" ON "Assinatura"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_mpPaymentId_key" ON "Pagamento"("mpPaymentId");

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

