-- WhatsApp/modalidade, sem-contato log, remarcação, retorno sugerido
ALTER TABLE "FilaAgendada"
  ADD COLUMN IF NOT EXISTS "whatsapp_contato"    TEXT,
  ADD COLUMN IF NOT EXISTS "modalidade_atend"    TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS "sem_contato_log"     JSONB,
  ADD COLUMN IF NOT EXISTS "remarcacoes"         INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "remarcacao_pendente" JSONB,
  ADD COLUMN IF NOT EXISTS "retorno_sugerido"    JSONB,
  ADD COLUMN IF NOT EXISTS "retorno_dispensado"  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FilaUrgente"
  ADD COLUMN IF NOT EXISTS "whatsapp_contato"   TEXT,
  ADD COLUMN IF NOT EXISTS "modalidade_atend"   TEXT NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS "sem_contato_log"    JSONB,
  ADD COLUMN IF NOT EXISTS "retorno_sugerido"   JSONB,
  ADD COLUMN IF NOT EXISTS "retorno_dispensado" BOOLEAN NOT NULL DEFAULT false;
