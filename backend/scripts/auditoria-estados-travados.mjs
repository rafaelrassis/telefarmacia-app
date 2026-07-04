/**
 * AUDITORIA DE ESTADOS TRAVADOS — apenas leitura, não modifica nada.
 * Execute: node backend/scripts/auditoria-estados-travados.mjs
 * Analise o output e decida o tratamento antes de ativar os cron jobs.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const LIMITE_AGUARDANDO_H = 2;   // urgentes aguardando > 2h
const LIMITE_ACEITO_H     = 2;   // urgentes aceitas sem início > 2h
const LIMITE_ATEND_H      = 4;   // em_atendimento > 4h

async function main() {
  const agora = new Date();

  // ── 1. Urgentes AGUARDANDO há mais de N horas ────────────────────────────
  const limiteAguardando = new Date(agora - LIMITE_AGUARDANDO_H * 3600 * 1000);
  const aguardando = await prisma.$queryRawUnsafe(`
    SELECT
      u.id,
      u.status,
      u."criadoEm",
      u."creditoDebitado",
      u."pacienteId",
      p.name AS paciente_nome,
      EXTRACT(EPOCH FROM (NOW() - u."criadoEm")) / 60 AS minutos_aguardando
    FROM "FilaUrgente" u
    JOIN "User" p ON p.id = u."pacienteId"
    WHERE u.status = 'aguardando'
      AND u."criadoEm" < $1
    ORDER BY u."criadoEm" ASC
  `, limiteAguardando);

  // ── 2. Urgentes ACEITAS sem início há mais de N horas ────────────────────
  const limiteAceito = new Date(agora - LIMITE_ACEITO_H * 3600 * 1000);
  const aceitas = await prisma.$queryRawUnsafe(`
    SELECT
      u.id,
      u.status,
      u."aceitoEm",
      u."creditoDebitado",
      u."pacienteId",
      u."farmaceuticoId",
      p.name  AS paciente_nome,
      f.name  AS farmaceutico_nome,
      EXTRACT(EPOCH FROM (NOW() - u."aceitoEm")) / 60 AS minutos_desde_aceite
    FROM "FilaUrgente" u
    JOIN "User" p ON p.id = u."pacienteId"
    LEFT JOIN "User" f ON f.id = u."farmaceuticoId"
    WHERE u.status = 'aceito'
      AND u."aceitoEm" < $1
    ORDER BY u."aceitoEm" ASC
  `, limiteAceito);

  // ── 3. Urgentes EM_ATENDIMENTO há mais de N horas ────────────────────────
  const limiteAtend = new Date(agora - LIMITE_ATEND_H * 3600 * 1000);
  const emAtendimentoUrgente = await prisma.$queryRawUnsafe(`
    SELECT
      u.id,
      u.status,
      u."aceitoEm",
      u."pacienteId",
      u."farmaceuticoId",
      p.name  AS paciente_nome,
      f.name  AS farmaceutico_nome,
      EXTRACT(EPOCH FROM (NOW() - u."aceitoEm")) / 60 AS minutos_em_atendimento
    FROM "FilaUrgente" u
    JOIN "User" p ON p.id = u."pacienteId"
    LEFT JOIN "User" f ON f.id = u."farmaceuticoId"
    WHERE u.status = 'em_atendimento'
      AND u."aceitoEm" < $1
    ORDER BY u."aceitoEm" ASC
  `, limiteAtend);

  // ── 4. Agendadas EM_ATENDIMENTO há mais de N horas (pela dataHora) ───────
  const emAtendimentoAgendada = await prisma.$queryRawUnsafe(`
    SELECT
      a.id,
      a.status,
      a."dataHora",
      a."pacienteId",
      a."farmaceuticoId",
      p.name  AS paciente_nome,
      f.name  AS farmaceutico_nome,
      EXTRACT(EPOCH FROM (NOW() - a."dataHora")) / 60 AS minutos_desde_inicio_previsto
    FROM "FilaAgendada" a
    JOIN "User" p ON p.id = a."pacienteId"
    LEFT JOIN "User" f ON f.id = a."farmaceuticoId"
    WHERE a.status = 'em_atendimento'
      AND a."dataHora" < $1
    ORDER BY a."dataHora" ASC
  `, limiteAtend);

  // ── Resultado ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  AUDITORIA DE ESTADOS TRAVADOS —', agora.toLocaleString('pt-BR'));
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`[1] Urgentes AGUARDANDO > ${LIMITE_AGUARDANDO_H}h: ${aguardando.length} registro(s)`);
  if (aguardando.length > 0) console.table(aguardando.map(r => ({
    id: r.id,
    paciente: r.paciente_nome,
    'min. aguardando': Math.round(Number(r.minutos_aguardando)),
    crédito: `R$ ${Number(r.credito_debitado || r.creditoDebitado).toFixed(2)}`,
  })));

  console.log(`\n[2] Urgentes ACEITAS sem início > ${LIMITE_ACEITO_H}h: ${aceitas.length} registro(s)`);
  if (aceitas.length > 0) console.table(aceitas.map(r => ({
    id: r.id,
    paciente: r.paciente_nome,
    farmacêutico: r.farmaceutico_nome,
    'min. desde aceite': Math.round(Number(r.minutos_desde_aceite)),
  })));

  console.log(`\n[3] Urgentes EM_ATENDIMENTO > ${LIMITE_ATEND_H}h: ${emAtendimentoUrgente.length} registro(s)`);
  if (emAtendimentoUrgente.length > 0) console.table(emAtendimentoUrgente.map(r => ({
    id: r.id,
    paciente: r.paciente_nome,
    farmacêutico: r.farmaceutico_nome,
    'min. em atendimento': Math.round(Number(r.minutos_em_atendimento)),
  })));

  console.log(`\n[4] Agendadas EM_ATENDIMENTO > ${LIMITE_ATEND_H}h: ${emAtendimentoAgendada.length} registro(s)`);
  if (emAtendimentoAgendada.length > 0) console.table(emAtendimentoAgendada.map(r => ({
    id: r.id,
    paciente: r.paciente_nome,
    farmacêutico: r.farmaceutico_nome,
    'min. desde início previsto': Math.round(Number(r.minutos_desde_inicio_previsto)),
  })));

  const total = aguardando.length + aceitas.length + emAtendimentoUrgente.length + emAtendimentoAgendada.length;
  console.log(`\n─── Total de registros travados: ${total} ─────────────────────────\n`);
  if (total === 0) console.log('✅ Nenhum estado travado encontrado. Os cron jobs podem ser ativados com segurança.\n');
  else console.log('⚠️  Revise os registros acima antes de ativar as regras de expiração automática.\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
