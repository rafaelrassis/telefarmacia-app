import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from './db.js';
import { hashResetToken } from '../src/utils/passwordResetToken.js';
import { registerPaciente } from './helpers.js';

// iat verificavelmente anterior ao passwordChangedAt — ver comentário
// equivalente em senha-alterar.test.js.
const tokenDeSessaoAntiga = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, isAdmin: false, iat: Math.floor(Date.now() / 1000) - 300 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const criarTokenReset = async (userId, { expiresAt, usedAt = null } = {}) => {
  const token = `token-plano-${Date.now()}-${Math.random()}`;
  await prisma.passwordReset.create({
    data: {
      userId,
      tokenHash: hashResetToken(token),
      expiresAt: expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
      usedAt,
    },
  });
  return token;
};

describe('esqueci minha senha — Fluxo 2 (deslogado)', () => {
  it('e-mail cadastrado → mensagem genérica + token de reset criado', async () => {
    const paciente = await registerPaciente(app);

    const res = await request(app).post('/api/auth/esqueci-senha').send({ email: paciente.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Se este e-mail estiver cadastrado, enviamos um link de redefinição.');

    const registros = await prisma.passwordReset.findMany({ where: { userId: paciente.user.id } });
    expect(registros.length).toBe(1);
    expect(registros[0].usedAt).toBeNull();
  });

  it('e-mail não cadastrado → mesma mensagem genérica, nenhum token criado', async () => {
    const res = await request(app)
      .post('/api/auth/esqueci-senha')
      .send({ email: `inexistente_${Date.now()}@teste.com` });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Se este e-mail estiver cadastrado, enviamos um link de redefinição.');

    const total = await prisma.passwordReset.count();
    expect(total).toBe(0);
  });
});

describe('redefinir senha — Fluxo 2 (via token)', () => {
  it('token válido → sucesso, login com nova senha funciona, sessões antigas derrubadas', async () => {
    const paciente = await registerPaciente(app);
    const token = await criarTokenReset(paciente.user.id);

    const res = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token, novaSenha: 'senhaRedefinida1', confirmarSenha: 'senhaRedefinida1' });

    expect(res.status).toBe(200);

    const meComTokenAntigo = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenDeSessaoAntiga(paciente.user)}`);
    expect(meComTokenAntigo.status).toBe(403);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: 'senhaRedefinida1' });
    expect(login.status).toBe(200);

    const logs = await prisma.$queryRawUnsafe(
      `SELECT * FROM log_acoes WHERE usuario_id = $1 AND acao = 'PASSWORD_RESET'`,
      paciente.user.id
    );
    expect(logs.length).toBe(1);
  });

  it('token expirado (31 min) → erro claro', async () => {
    const paciente = await registerPaciente(app);
    const token = await criarTokenReset(paciente.user.id, {
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    const res = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token, novaSenha: 'senhaRedefinida1', confirmarSenha: 'senhaRedefinida1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Token inválido ou expirado.');
  });

  it('token já usado → segunda tentativa falha', async () => {
    const paciente = await registerPaciente(app);
    const token = await criarTokenReset(paciente.user.id);

    const primeira = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token, novaSenha: 'senhaRedefinida1', confirmarSenha: 'senhaRedefinida1' });
    expect(primeira.status).toBe(200);

    const segunda = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token, novaSenha: 'outraSenhaNova1', confirmarSenha: 'outraSenhaNova1' });
    expect(segunda.status).toBe(400);
    expect(segunda.body.error).toBe('Token inválido ou expirado.');
  });

  it('gerar novo token invalida o anterior ainda ativo', async () => {
    const paciente = await registerPaciente(app);
    const tokenAntigo = await criarTokenReset(paciente.user.id);

    await request(app).post('/api/auth/esqueci-senha').send({ email: paciente.email });

    const usoAntigo = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: tokenAntigo, novaSenha: 'senhaRedefinida1', confirmarSenha: 'senhaRedefinida1' });
    expect(usoAntigo.status).toBe(400);
  });
});
