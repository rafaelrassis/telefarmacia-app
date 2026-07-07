import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './db.js';
import {
  registerPaciente, criarFarmaceuticoAprovado, creditarCarteira, bookUrgente,
  acceptUrgente,
} from './helpers.js';

describe('fila urgente — posição na fila', () => {
  it('com 2 urgentes na frente, GET /fila/urgente/ativa retorna posicao: 3', async () => {
    await criarFarmaceuticoAprovado(app); // necessário para agendarUrgente aceitar a criação

    const p1 = await registerPaciente(app);
    await creditarCarteira(app, p1.token, 200);
    const b1 = await bookUrgente(app, p1.token);
    expect(b1.status).toBe(201);

    const p2 = await registerPaciente(app);
    await creditarCarteira(app, p2.token, 200);
    const b2 = await bookUrgente(app, p2.token);
    expect(b2.status).toBe(201);

    const p3 = await registerPaciente(app);
    await creditarCarteira(app, p3.token, 200);
    const b3 = await bookUrgente(app, p3.token);
    expect(b3.status).toBe(201);

    const ativa = await request(app)
      .get('/api/fila/urgente/ativa')
      .set('Authorization', `Bearer ${p3.token}`);
    expect(ativa.status).toBe(200);
    expect(ativa.body.urgente.status).toBe('aguardando');
    expect(ativa.body.urgente.posicao).toBe(3);
    expect(ativa.body.urgente.total_aguardando).toBe(3);
  });
});

describe('fila urgente — aceite', () => {
  it('aceitar grava farmaceuticoId e aceitoEm', async () => {
    const farm = await criarFarmaceuticoAprovado(app);
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookUrgente(app, paciente.token);
    expect(book.status).toBe(201);

    const accept = await acceptUrgente(app, farm.token, book.body.id);
    expect(accept.status).toBe(200);

    const fila = await prisma.filaUrgente.findUnique({ where: { id: book.body.id } });
    expect(fila.farmaceuticoId).toBe(farm.userId);
    expect(fila.aceitoEm).not.toBeNull();
    expect(fila.status).toBe('aceito');
  });
});

describe('fila urgente — corrida de aceite', () => {
  it('dois farmacêuticos aceitando a mesma urgente: o segundo recebe erro e o vínculo não muda', async () => {
    const farm1 = await criarFarmaceuticoAprovado(app);
    const farm2 = await criarFarmaceuticoAprovado(app);
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookUrgente(app, paciente.token);

    const accept1 = await acceptUrgente(app, farm1.token, book.body.id);
    expect(accept1.status).toBe(200);

    const accept2 = await acceptUrgente(app, farm2.token, book.body.id);
    expect(accept2.status).toBe(409);

    const fila = await prisma.filaUrgente.findUnique({ where: { id: book.body.id } });
    expect(fila.farmaceuticoId).toBe(farm1.userId);
  });
});

describe('fila urgente — devolução e sem-contato', () => {
  it('devolução volta a aguardando sem farmacêutico', async () => {
    const farm = await criarFarmaceuticoAprovado(app);
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookUrgente(app, paciente.token);
    await acceptUrgente(app, farm.token, book.body.id);

    const devolver = await request(app)
      .patch(`/api/consulta/${book.body.id}/devolver`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'urgente', motivo: 'Imprevisto' });
    expect(devolver.status).toBe(200);

    const fila = await prisma.filaUrgente.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('aguardando');
    expect(fila.farmaceuticoId).toBeNull();
  });

  it('sem-contato cancela a urgente e devolve o crédito', async () => {
    const farm = await criarFarmaceuticoAprovado(app);
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookUrgente(app, paciente.token);
    await acceptUrgente(app, farm.token, book.body.id);

    const semContato = await request(app)
      .patch(`/api/consulta/${book.body.id}/sem-contato`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'urgente' });
    expect(semContato.status).toBe(200);

    const fila = await prisma.filaUrgente.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('cancelado');

    const saldo = await request(app)
      .get('/api/carteira/saldo')
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(saldo.body.saldo_disponivel).toBe(200);
  });
});
