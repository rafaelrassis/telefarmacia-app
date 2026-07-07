import { describe, it, expect } from 'vitest';
import app from '../src/app.js';
import { prisma } from './db.js';
import {
  registerPaciente, creditarCarteira, getSaldo,
  bookAgendada, bookUrgente, cancelarAgendada, cancelarUrgente,
} from './helpers.js';
import { jobExpirarAgendadasOrfas, jobExpirarUrgentesAguardando } from '../src/cronJobs.js';

describe('estornos — cancelamento pelo paciente', () => {
  it('cancelar agendada estorna integralmente e grava transação estorno', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    expect(await getSaldo(app, paciente.token)).toBe(150);

    const cancel = await cancelarAgendada(app, paciente.token, book.body.id);
    expect(cancel.status).toBe(200);
    expect(await getSaldo(app, paciente.token)).toBe(200);

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: paciente.user.id } });
    const estornos = await prisma.transacaoCarteira.findMany({
      where: { carteiraId: carteira.id, tipo: 'estorno' },
    });
    expect(estornos).toHaveLength(1);
    expect(Number(estornos[0].saldoApos)).toBe(200);
  });

  it('idempotência: cancelar a mesma consulta agendada duas vezes não estorna duas vezes', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);

    const primeiro = await cancelarAgendada(app, paciente.token, book.body.id);
    expect(primeiro.status).toBe(200);
    const segundo = await cancelarAgendada(app, paciente.token, book.body.id);
    expect(segundo.status).toBe(400);

    expect(await getSaldo(app, paciente.token)).toBe(200);
    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: paciente.user.id } });
    const estornos = await prisma.transacaoCarteira.findMany({
      where: { carteiraId: carteira.id, tipo: 'estorno' },
    });
    expect(estornos).toHaveLength(1);
  });

  it('cancelar urgente estorna integralmente', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    // Sem farmacêutico online -> agendarUrgente responde 503; para testar o
    // cancelamento em si, criamos a urgente diretamente e debitamos via API
    // equivalente não é possível sem farmacêutico disponível, então validamos
    // a idempotência/estorno via helper de cancelamento sobre uma urgente
    // criada com farmacêutico disponível.
    const { criarFarmaceuticoAprovado } = await import('./helpers.js');
    await criarFarmaceuticoAprovado(app);

    const book = await bookUrgente(app, paciente.token);
    expect(book.status).toBe(201);
    expect(await getSaldo(app, paciente.token)).toBe(150);

    const cancel = await cancelarUrgente(app, paciente.token, book.body.id);
    expect(cancel.status).toBe(200);
    expect(await getSaldo(app, paciente.token)).toBe(200);
  });

  it('idempotência: cancelar a mesma urgente duas vezes não estorna duas vezes', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const { criarFarmaceuticoAprovado } = await import('./helpers.js');
    await criarFarmaceuticoAprovado(app);

    const book = await bookUrgente(app, paciente.token);
    const primeiro = await cancelarUrgente(app, paciente.token, book.body.id);
    expect(primeiro.status).toBe(200);
    const segundo = await cancelarUrgente(app, paciente.token, book.body.id);
    expect(segundo.status).toBe(400);

    expect(await getSaldo(app, paciente.token)).toBe(200);
  });
});

describe('estornos — expiração via cron (invocação direta)', () => {
  it('agendada aguardando vencida além da tolerância → cancelada + estorno + notificação', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);

    // Backdata a dataHora para além da tolerância (30min, seed padrão) — a API
    // real não permite agendar no passado, então isso é feito direto no banco
    // (exceção explícita permitida pela spec para o que a API não cobre).
    const vencida = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.filaAgendada.update({ where: { id: book.body.id }, data: { dataHora: vencida } });

    await jobExpirarAgendadasOrfas();

    const fila = await prisma.filaAgendada.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('cancelado');
    expect(await getSaldo(app, paciente.token)).toBe(200);

    const notificacoes = await prisma.notificacao.findMany({
      where: { userId: paciente.user.id, consultaId: book.body.id },
    });
    expect(notificacoes.length).toBeGreaterThanOrEqual(1);
    expect(notificacoes.some((n) => n.tipo === 'estorno')).toBe(true);
  });

  it('agendada aguardando dentro da tolerância → intocada', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);

    await jobExpirarAgendadasOrfas();

    const fila = await prisma.filaAgendada.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('aguardando');
    expect(await getSaldo(app, paciente.token)).toBe(150);
  });

  it('urgente aguardando expirada (sem farmacêutico aceitar) → cancelada + estorno + notificação', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const { criarFarmaceuticoAprovado } = await import('./helpers.js');
    await criarFarmaceuticoAprovado(app);

    const book = await bookUrgente(app, paciente.token);
    expect(book.status).toBe(201);

    const vencida = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.filaUrgente.update({ where: { id: book.body.id }, data: { criadoEm: vencida } });

    await jobExpirarUrgentesAguardando();

    const fila = await prisma.filaUrgente.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('cancelado');
    expect(await getSaldo(app, paciente.token)).toBe(200);

    const notificacoes = await prisma.notificacao.findMany({
      where: { userId: paciente.user.id, consultaId: book.body.id },
    });
    expect(notificacoes.some((n) => n.tipo === 'urgente_expirada')).toBe(true);
  });

  it('urgente aguardando recente (dentro do limite) → intocada', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const { criarFarmaceuticoAprovado } = await import('./helpers.js');
    await criarFarmaceuticoAprovado(app);

    const book = await bookUrgente(app, paciente.token);

    await jobExpirarUrgentesAguardando();

    const fila = await prisma.filaUrgente.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('aguardando');
    expect(await getSaldo(app, paciente.token)).toBe(150);
  });
});
