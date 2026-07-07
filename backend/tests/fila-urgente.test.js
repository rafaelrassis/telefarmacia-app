import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  registerPaciente, criarFarmaceuticoAprovado, creditarCarteira, bookUrgente,
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
