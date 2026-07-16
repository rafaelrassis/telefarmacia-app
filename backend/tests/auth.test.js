import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './db.js';
import { registerPaciente } from './helpers.js';

describe('auth — registro e login', () => {
  it('registro retorna JWT válido e permite acessar rota protegida', async () => {
    const email = `paciente_auth_${Date.now()}@teste.com`;
    const registro = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'senha123', nome: 'Fulano' });
    expect(registro.status).toBe(201);
    expect(typeof registro.body.token).toBe('string');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registro.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });

  it('login retorna JWT válido', async () => {
    const email = `paciente_auth2_${Date.now()}@teste.com`;
    await request(app).post('/api/auth/register').send({ email, password: 'senha123', nome: 'Fulano' });
    // Login com credenciais exige e-mail confirmado (ver confirmacao-email.test.js
    // para o fluxo de confirmação em si) — este teste cobre só o login em si.
    await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });

    const login = await request(app).post('/api/auth/login').send({ email, password: 'senha123' });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');
  });

  it('senha errada → 401', async () => {
    const email = `paciente_auth3_${Date.now()}@teste.com`;
    await request(app).post('/api/auth/register').send({ email, password: 'senha123', nome: 'Fulano' });

    const login = await request(app).post('/api/auth/login').send({ email, password: 'senhaerrada' });
    expect(login.status).toBe(401);
  });

  it('token ausente em rota protegida → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('token inválido em rota protegida → 403', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(403);
  });

  it('registro público com e-mail admin → 403', async () => {
    const registro = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin.teste@telefarmacia.test', password: 'senha123', nome: 'Fulano' });
    expect(registro.status).toBe(403);
  });
});

describe('auth — exclusão de conta (LGPD)', () => {
  it('exclui/anonimiza a conta e invalida o login', async () => {
    const paciente = await registerPaciente(app);

    const exclusao = await request(app)
      .post('/api/lgpd/excluir-conta')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ email: paciente.email });
    expect(exclusao.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });
    expect(login.status).toBe(401);
  });

  it('e-mail de confirmação divergente → 400, conta não é excluída', async () => {
    const paciente = await registerPaciente(app);

    const exclusao = await request(app)
      .post('/api/lgpd/excluir-conta')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ email: 'email-errado@teste.com' });
    expect(exclusao.status).toBe(400);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });
    expect(login.status).toBe(200);
  });
});
