-- CreateTable: PartnerPharmacy
CREATE TABLE "PartnerPharmacy" (
  "id"            TEXT        NOT NULL,
  "nome"          TEXT        NOT NULL,
  "logoUrl"       TEXT,
  "baseUrl"       TEXT        NOT NULL,
  "affiliateCode" TEXT        NOT NULL,
  "linkTemplate"  TEXT,
  "ativo"         BOOLEAN     NOT NULL DEFAULT true,
  "ordem"         INTEGER     NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerPharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AffiliateClick
CREATE TABLE "AffiliateClick" (
  "id"         TEXT        NOT NULL,
  "pharmacyId" TEXT        NOT NULL,
  "consultaId" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AffiliateClick"
  ADD CONSTRAINT "AffiliateClick_pharmacyId_fkey"
  FOREIGN KEY ("pharmacyId") REFERENCES "PartnerPharmacy"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for metrics queries
CREATE INDEX "AffiliateClick_pharmacyId_createdAt_idx"
  ON "AffiliateClick" ("pharmacyId", "createdAt");
