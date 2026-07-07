import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './db.js';
import {
  registerPaciente, criarFarmaceuticoAprovado, creditarCarteira, getSaldo,
  bookAgendada, acceptAgendada,
} from './helpers.js';

describe('carteira — recarga', () => {
  it('recarga simulada (PIX) credita o saldo e gera TransacaoCarteira com saldoApos correto', async () => {
    const paciente = await registerPaciente(app);

    const checkout = await request(app)
      .post('/api/pagamentos/simular-checkout')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ valor_pretendido: 100 });
    expect(checkout.status).toBe(201);
    expect(checkout.body.status).toBe('Pendente');

    const confirmar = await request(app)
      .post(`/api/pagamentos/${checkout.body.pagamento_id}/confirmar`)
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(confirmar.status).toBe(200);
    expect(confirmar.body.novo_saldo_creditos).toBe(100);

    const saldo = await getSaldo(app, paciente.token);
    expect(saldo).toBe(100);

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: paciente.user.id } });
    const transacoes = await prisma.transacaoCarteira.findMany({ where: { carteiraId: carteira.id } });
    expect(transacoes).toHaveLength(1);
    expect(transacoes[0].tipo).toBe('credito');
    expect(Number(transacoes[0].valor)).toBe(100);
    expect(Number(transacoes[0].saldoApos)).toBe(100);
  });

  it('confirmar o mesmo pagamento duas vezes não credita duas vezes', async () => {
    const paciente = await registerPaciente(app);
    const checkout = await request(app)
      .post('/api/pagamentos/simular-checkout')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ valor_pretendido: 100 });

    const primeira = await request(app)
      .post(`/api/pagamentos/${checkout.body.pagamento_id}/confirmar`)
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(primeira.status).toBe(200);

    const segunda = await request(app)
      .post(`/api/pagamentos/${checkout.body.pagamento_id}/confirmar`)
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(segunda.status).toBe(400);

    const saldo = await getSaldo(app, paciente.token);
    expect(saldo).toBe(100);
  });
});

describe('carteira — débito ao agendar', () => {
  it('agendar consulta debita o valor vigente (preco_consulta)', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);

    const book = await bookAgendada(app, paciente.token);
    expect(book.status).toBe(201);
    expect(book.body.preco_cobrado).toBe(50);

    const saldo = await getSaldo(app, paciente.token);
    expect(saldo).toBe(150);
  });

  it('saldo insuficiente → 402, sem debitar nem criar consulta', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 10); // preco_consulta = 50

    const book = await bookAgendada(app, paciente.token);
    expect(book.status).toBe(402);

    const saldo = await getSaldo(app, paciente.token);
    expect(saldo).toBe(10);

    const consultas = await prisma.filaAgendada.findMany({ where: { pacienteId: paciente.user.id } });
    expect(consultas).toHaveLength(0);
  });

  it('sem carteira nenhuma (nunca creditou) → 402, sem criar consulta', async () => {
    const paciente = await registerPaciente(app);
    const book = await bookAgendada(app, paciente.token);
    expect(book.status).toBe(402);

    const consultas = await prisma.filaAgendada.findMany({ where: { pacienteId: paciente.user.id } });
    expect(consultas).toHaveLength(0);
  });
});

describe('carteira — ajuste manual do admin', () => {
  it('sem motivo → 400', async () => {
    const paciente = await registerPaciente(app);
    const admin = await request(app).post('/api/auth/register').send({
      email: (process.env.ADMIN_EMAILS || '').split(',')[0].trim(),
      password: 'senha123',
      nome: 'Admin',
    });
    const res = await request(app)
      .post(`/api/admin/carteira/${paciente.user.id}/ajuste`)
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ valor: 20 });
    expect(res.status).toBe(400);
  });

  it('débito que negativaria o saldo → 400', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 30);
    const admin = await request(app).post('/api/auth/register').send({
      email: (process.env.ADMIN_EMAILS || '').split(',')[0].trim(),
      password: 'senha123',
      nome: 'Admin',
    });
    const res = await request(app)
      .post(`/api/admin/carteira/${paciente.user.id}/ajuste`)
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ valor: -50, motivo: 'teste de estorno indevido' });
    expect(res.status).toBe(400);

    const saldo = await getSaldo(app, paciente.token);
    expect(saldo).toBe(30);
  });

  it('ajuste válido grava saldo, transação ajuste_admin e AdminAuditLog', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 30);
    const adminEmail = (process.env.ADMIN_EMAILS || '').split(',')[0].trim();
    const admin = await request(app).post('/api/auth/register').send({
      email: adminEmail, password: 'senha123', nome: 'Admin',
    });

    const res = await request(app)
      .post(`/api/admin/carteira/${paciente.user.id}/ajuste`)
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ valor: 25, motivo: 'correção de cobrança duplicada' });
    expect(res.status).toBe(200);

    const saldo = await getSaldo(app, paciente.token);
    expect(saldo).toBe(55);

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId: paciente.user.id } });
    const transacoes = await prisma.transacaoCarteira.findMany({
      where: { carteiraId: carteira.id, tipo: 'ajuste_admin' },
    });
    expect(transacoes).toHaveLength(1);
    expect(Number(transacoes[0].saldoApos)).toBe(55);

    const auditLogs = await prisma.adminAuditLog.findMany({
      where: { alvoId: paciente.user.id, acao: 'ajustar_carteira' },
    });
    expect(auditLogs).toHaveLength(1);
  });
});

describe('carteira — comissão gravada por consulta', () => {
  it('conclusão de consulta grava comissao_percentual padrão quando não há override', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);

    const book = await bookAgendada(app, paciente.token);
    await acceptAgendada(app, farm.token, book.body.id);
    await request(app)
      .patch(`/api/consulta/${book.body.id}/iniciar`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'agendada' });
    await request(app)
      .patch(`/api/consulta/${book.body.id}/concluir`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'agendada', observacoes: 'Concluído.' });

    const rows = await prisma.$queryRawUnsafe(
      `SELECT "comissao_percentual" FROM "FilaAgendada" WHERE id = $1`, book.body.id
    );
    expect(Number(rows[0].comissao_percentual)).toBe(70); // seed: comissao_padrao = '70'
  });

  it('conclusão de consulta grava comissao_percentual específica do farmacêutico quando há override', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);

    await prisma.$executeRawUnsafe(
      `INSERT INTO comissoes_individuais (farmaceutico_id, percentual, atualizado_em) VALUES ($1, $2, NOW())`,
      farm.userId, 85
    );

    const book = await bookAgendada(app, paciente.token);
    await acceptAgendada(app, farm.token, book.body.id);
    await request(app)
      .patch(`/api/consulta/${book.body.id}/iniciar`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'agendada' });
    await request(app)
      .patch(`/api/consulta/${book.body.id}/concluir`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'agendada', observacoes: 'Concluído.' });

    const rows = await prisma.$queryRawUnsafe(
      `SELECT "comissao_percentual" FROM "FilaAgendada" WHERE id = $1`, book.body.id
    );
    expect(Number(rows[0].comissao_percentual)).toBe(85);
  });
});
