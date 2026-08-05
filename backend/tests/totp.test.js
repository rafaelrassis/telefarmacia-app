import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { authenticator } from 'otplib';
import app from '../src/app.js';
import { registerPaciente } from './helpers.js';

describe('auth — TOTP (2FA opcional)', () => {
  it('setup → enable → login exige tempToken + código → verify libera o token final', async () => {
    const paciente = await registerPaciente(app);

    const setup = await request(app)
      .post('/api/auth/totp/setup')
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(setup.status).toBe(200);
    expect(typeof setup.body.otpauthUrl).toBe('string');
    expect(setup.body.backupCodes).toHaveLength(10);

    const secret = new URL(setup.body.otpauthUrl).searchParams.get('secret');
    const enable = await request(app)
      .post('/api/auth/totp/enable')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ code: authenticator.generate(secret) });
    expect(enable.status).toBe(200);

    // Login volta a pedir usuário/senha normalmente, mas agora não emite
    // token final — só o tempToken de escopo restrito.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });
    expect(login.status).toBe(200);
    expect(login.body.requiresTotp).toBe(true);
    expect(typeof login.body.tempToken).toBe('string');
    expect(login.body.token).toBeUndefined();

    // tempToken não deve funcionar como sessão normal.
    const meComTempToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.tempToken}`);
    expect(meComTempToken.status).toBe(403);

    const verify = await request(app)
      .post('/api/auth/totp/verify')
      .send({ tempToken: login.body.tempToken, code: authenticator.generate(secret) });
    expect(verify.status).toBe(200);
    expect(typeof verify.body.token).toBe('string');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${verify.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(paciente.email);
  });

  it('verify com código inválido → 401', async () => {
    const paciente = await registerPaciente(app);
    const setup = await request(app)
      .post('/api/auth/totp/setup')
      .set('Authorization', `Bearer ${paciente.token}`);
    const secret = new URL(setup.body.otpauthUrl).searchParams.get('secret');
    await request(app)
      .post('/api/auth/totp/enable')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ code: authenticator.generate(secret) });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });

    const verify = await request(app)
      .post('/api/auth/totp/verify')
      .send({ tempToken: login.body.tempToken, code: '000000' });
    expect(verify.status).toBe(401);
  });

  it('backup code funciona uma única vez', async () => {
    const paciente = await registerPaciente(app);
    const setup = await request(app)
      .post('/api/auth/totp/setup')
      .set('Authorization', `Bearer ${paciente.token}`);
    const secret = new URL(setup.body.otpauthUrl).searchParams.get('secret');
    await request(app)
      .post('/api/auth/totp/enable')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ code: authenticator.generate(secret) });

    const backupCode = setup.body.backupCodes[0];

    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });
    const verify1 = await request(app)
      .post('/api/auth/totp/verify')
      .send({ tempToken: login1.body.tempToken, code: backupCode });
    expect(verify1.status).toBe(200);

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });
    const verify2 = await request(app)
      .post('/api/auth/totp/verify')
      .send({ tempToken: login2.body.tempToken, code: backupCode });
    expect(verify2.status).toBe(401);
  });

  it('disable exige senha ou código válido', async () => {
    const paciente = await registerPaciente(app);
    const setup = await request(app)
      .post('/api/auth/totp/setup')
      .set('Authorization', `Bearer ${paciente.token}`);
    const secret = new URL(setup.body.otpauthUrl).searchParams.get('secret');
    await request(app)
      .post('/api/auth/totp/enable')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ code: authenticator.generate(secret) });

    const semAutorizacao = await request(app)
      .post('/api/auth/totp/disable')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({});
    expect(semAutorizacao.status).toBe(400);

    const comSenha = await request(app)
      .post('/api/auth/totp/disable')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ password: paciente.password });
    expect(comSenha.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });
    expect(login.body.requiresTotp).toBeUndefined();
    expect(typeof login.body.token).toBe('string');
  });
});
