// Script manual de limpeza: apaga TODAS as consultas (FilaAgendada e FilaUrgente),
// de qualquer status, mantendo intactos os logins (tabela User) e demais dados de
// cadastro (perfis, dependentes, carteira etc).
//
// Não roda automaticamente no build/deploy (não segue o padrão migrate-*.mjs usado
// por scripts/migrate-all.mjs) — é destrutivo e deve ser executado manualmente.
//
// Uso:
//   node scripts/limpar-consultas.mjs           -> apenas mostra quantos registros seriam apagados
//   CONFIRM=1 node scripts/limpar-consultas.mjs  -> executa a limpeza de fato
//
// Avaliações vinculadas a essas consultas (Avaliacao.filaAgendadaId/filaUrgenteId)
// são removidas em cascata pelo próprio banco (ON DELETE CASCADE).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [totalAgendada, totalUrgente] = await Promise.all([
    prisma.filaAgendada.count(),
    prisma.filaUrgente.count(),
  ]);

  console.log(`FilaAgendada: ${totalAgendada} registro(s) encontrados (todos os status).`);
  console.log(`FilaUrgente:  ${totalUrgente} registro(s) encontrados (todos os status).`);

  if (process.env.CONFIRM !== '1') {
    console.log('\nNenhum dado foi apagado. Rode novamente com CONFIRM=1 para confirmar a exclusão.');
    return;
  }

  const [{ count: apagadasAgendada }, { count: apagadasUrgente }] = await Promise.all([
    prisma.filaAgendada.deleteMany({}),
    prisma.filaUrgente.deleteMany({}),
  ]);

  console.log(`\n✅ ${apagadasAgendada} consulta(s) agendada(s) apagada(s).`);
  console.log(`✅ ${apagadasUrgente} consulta(s) urgente(s) apagada(s).`);
  console.log('✅ Logins (tabela User) e demais cadastros permanecem intactos.');
}

main()
  .catch((err) => {
    console.error('Falha ao limpar consultas:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
