import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  registerPaciente,
  creditarCarteira,
  getSaldo,
  getAdminToken,
  bookAgendada,
} from './helpers.js';

const setSistemaAberto = async (adminToken, aberto) =>
  request(app)
    .patch('/api/admin/sistema')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ aberto });

describe('toggle Aberto/Fechado do admin bloqueia agendamento de verdade', () => {
  // Sempre reabre ao final de cada teste — o toggle é uma configuração
  // global (SystemConfig), não isolada por teste.
  afterEach(async () => {
    const adminToken = await getAdminToken(app);
    await setSistemaAberto(adminToken, true);
  });

  it('GET /api/sistema/aberto reflete o fechamento manual', async () => {
    const adminToken = await getAdminToken(app);
    await setSistemaAberto(adminToken, false);

    const status = await request(app).get('/api/sistema/aberto');
    expect(status.status).toBe(200);
    expect(status.body.aberto).toBe(false);
    expect(status.body.motivo).toMatch(/administrador/i);
  });

  it('sistema fechado → POST /api/fila/agendar retorna erro e não debita crédito', async () => {
    const adminToken = await getAdminToken(app);
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const saldoAntes = await getSaldo(app, paciente.token);

    await setSistemaAberto(adminToken, false);

    const book = await bookAgendada(app, paciente.token);
    expect(book.status).toBe(400);
    expect(book.body.error).toMatch(/fechado/i);

    const saldoDepois = await getSaldo(app, paciente.token);
    expect(saldoDepois).toBe(saldoAntes);
  });

  it('sistema fechado → POST /api/fila/urgente retorna erro e não debita crédito', async () => {
    const adminToken = await getAdminToken(app);
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const saldoAntes = await getSaldo(app, paciente.token);

    await setSistemaAberto(adminToken, false);

    const res = await request(app)
      .post('/api/fila/urgente')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fechado/i);

    const saldoDepois = await getSaldo(app, paciente.token);
    expect(saldoDepois).toBe(saldoAntes);
  });

  it('reabrir o sistema permite agendar novamente', async () => {
    const adminToken = await getAdminToken(app);
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);

    await setSistemaAberto(adminToken, false);
    const bloqueado = await bookAgendada(app, paciente.token);
    expect(bloqueado.status).toBe(400);

    await setSistemaAberto(adminToken, true);
    const liberado = await bookAgendada(app, paciente.token);
    expect(liberado.status).toBe(201);
  });
});
