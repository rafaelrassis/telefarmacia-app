// Guard de segurança: nenhum teste pode rodar contra um banco que não seja de
// teste. Chamado tanto no globalSetup (uma vez, antes de aplicar schema) quanto
// no setupFiles (por arquivo de teste) — dupla proteção, custo desprezível.
export function assertTestDatabase() {
  const url = process.env.DATABASE_URL || '';
  if (!url.toLowerCase().includes('test')) {
    throw new Error(
      `[tests] DATABASE_URL não parece apontar para um banco de teste: "${url}". ` +
      'Abortando para proteger dev/produção. Configure backend/.env.test com uma ' +
      'DATABASE_URL cujo nome do banco contenha "test".'
    );
  }
}
