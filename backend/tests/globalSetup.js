import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { assertTestDatabase } from './_guard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.join(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.test') });
process.env.NODE_ENV = 'test';

// Migrations raw que não estão (ainda) no schema.prisma — ver TECHNICAL.md
// seção "Campos raw" e "Scripts de manutenção". Rodadas nesta ordem porque
// todas dependem das tabelas base já criadas pelo `prisma db push` acima.
const RAW_MIGRATIONS = [
  'migrate-consulta-campos.mjs',
  'migrate-receita-campos.mjs',
  'migrate-devolucao-campos.mjs',
  'migrate-encaminhamento-pdf.mjs',
  'migrate-cancelamento-remarcacao-campos.mjs',
  'migrate-comissao-percentual.mjs',
  'migrate-comissoes-individuais.mjs',
  'migrate-lembrete-enviado.mjs',
  'migrate-triagem-contato-campos.mjs',
  'migrate-retorno-sugerido.mjs',
  'migrate-paciente-dados-saude.mjs',
  'migrate-log-acoes.mjs',
  'migrate-anexo-receita-paciente.mjs',
];

export async function setup() {
  assertTestDatabase();

  console.log(`[tests] Aplicando schema em ${process.env.DATABASE_URL}...`);
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: rootDir, stdio: 'inherit', env: process.env,
  });

  for (const script of RAW_MIGRATIONS) {
    execSync(`node scripts/${script}`, { cwd: rootDir, stdio: 'inherit', env: process.env });
  }

  console.log('[tests] Banco de teste pronto.');
}
