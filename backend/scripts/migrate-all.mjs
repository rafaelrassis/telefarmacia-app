// Orquestrador dos scripts de migração manual ("shadow columns").
//
// Por que existe: o projeto usa colunas fora do schema Prisma, criadas por
// scripts migrate-*.mjs neste diretório. O `prisma migrate deploy` não cria
// essas colunas — se um script não for executado em produção, endpoints com
// SQL cru quebram com 500 (ex.: GET /api/paciente/documentos). Este script
// roda todos eles automaticamente no build do deploy.
//
// Contrato: todo migrate-*.mjs deve ser idempotente (ADD COLUMN IF NOT
// EXISTS, CREATE TABLE IF NOT EXISTS etc.) — rodar de novo é sempre seguro.
//
// Descoberta: novos scripts migrate-*.mjs são captados automaticamente pelo
// glob (ordem alfabética), sem necessidade de manter lista aqui.
//
// Dry-run: DRY_RUN=1 node scripts/migrate-all.mjs apenas lista o que seria
// executado, sem tocar no banco (útil em CI/ambientes sem DATABASE_URL).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const self = path.basename(fileURLToPath(import.meta.url));

const scripts = fs
  .readdirSync(scriptsDir)
  .filter((f) => f.startsWith('migrate-') && f.endsWith('.mjs') && f !== self)
  .sort();

if (process.env.DRY_RUN === '1') {
  console.log(`[migrate-all] DRY_RUN=1 — ${scripts.length} scripts seriam executados, nesta ordem:`);
  scripts.forEach((f, i) => console.log(`[migrate-all]   ${i + 1}/${scripts.length} ${f}`));
  process.exit(0);
}

scripts.forEach((f, i) => {
  console.log(`[migrate-all] executando ${f} (${i + 1}/${scripts.length})`);
  const result = spawnSync('node', [path.join(scriptsDir, f)], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[migrate-all] FALHA em ${f} (exit code ${result.status ?? 'null'}). Abortando.`);
    process.exit(result.status ?? 1);
  }
});

console.log(`[migrate-all] concluído: ${scripts.length} scripts executados com sucesso.`);
