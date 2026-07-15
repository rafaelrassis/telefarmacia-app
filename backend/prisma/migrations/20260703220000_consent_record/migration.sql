CREATE TABLE "ConsentRecord" (
  "id"          TEXT        NOT NULL,
  "userId"      TEXT        NOT NULL,
  "tipoTermo"   TEXT        NOT NULL,
  "versaoTermo" TEXT        NOT NULL,
  "aceitoEm"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip"          TEXT,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ConsentRecord_userId_tipoTermo_versaoTermo_key"
  ON "ConsentRecord"("userId", "tipoTermo", "versaoTermo");

CREATE INDEX "ConsentRecord_userId_tipoTermo_idx"
  ON "ConsentRecord"("userId", "tipoTermo");
