import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from './db.js';
import { signToken } from '../src/controllers/AuthController.js';
import { registerPaciente, registerFarmaceutico } from './helpers.js';

// Um token "de outra sessão" precisa de um `iat` verificavelmente anterior ao
// instante da troca de senha — como os testes rodam rápido, um token emitido
// há poucos milissegundos pode cair no mesmo segundo de `passwordChangedAt`
// (granularidade do `iat` do JWT) e não seria invalidado por engano. Um iat
// alguns minutos no passado remove essa ambiguidade.
const tokenDeSessaoAntiga = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, isAdmin: false, iat: Math.floor(Date.now() / 1000) - 300 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// Fluxo 1 (alterar senha, logado) e Fluxo 3 (definir senha, usuário OAuth
// sem senha local) — mesmo endpoint POST /api/conta/alterar-senha.

describe('alterar senha — Fluxo 1 (paciente)', () => {
  it('senha atual correta + nova senha válida → sucesso, outras sessões derrubadas, e-mail notificado', async () => {
    const paciente = await registerPaciente(app);
    const outraSessaoToken = tokenDeSessaoAntiga(paciente.user); // simula um segundo dispositivo logado

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ senhaAtual: paciente.password, novaSenha: 'novaSenhaForte1', confirmarSenha: 'novaSenhaForte1' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');

    // Sessão antiga (mesmo token usado para autenticar a troca) foi emitida
    // ANTES do passwordChangedAt e deve ser recusada agora.
    const meComTokenAntigo = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${outraSessaoToken}`);
    expect(meComTokenAntigo.status).toBe(403);

    // O NOVO token (retornado na própria resposta) continua válido.
    const meComTokenNovo = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(meComTokenNovo.status).toBe(200);

    // Login com a nova senha funciona.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: 'novaSenhaForte1' });
    expect(login.status).toBe(200);

    // Auditoria (LGPD) registrada.
    const logs = await prisma.$queryRawUnsafe(
      `SELECT * FROM log_acoes WHERE usuario_id = $1 AND acao = 'PASSWORD_CHANGED'`,
      paciente.user.id
    );
    expect(logs.length).toBe(1);
  });

  it('senha atual incorreta → 400 genérico, senha não muda', async () => {
    const paciente = await registerPaciente(app);

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ senhaAtual: 'senha-errada', novaSenha: 'novaSenhaForte1', confirmarSenha: 'novaSenhaForte1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Senha atual incorreta.');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: paciente.email, password: paciente.password });
    expect(login.status).toBe(200);
  });

  it('nova senha com menos de 8 caracteres → erro de validação', async () => {
    const paciente = await registerPaciente(app);

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ senhaAtual: paciente.password, novaSenha: 'curta12', confirmarSenha: 'curta12' });

    expect(res.status).toBe(400);
  });

  it('nova senha igual à atual → erro de validação', async () => {
    const paciente = await registerPaciente(app);

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ senhaAtual: paciente.password, novaSenha: paciente.password, confirmarSenha: paciente.password });

    expect(res.status).toBe(400);
  });

  it('confirmação divergente → erro de validação', async () => {
    const paciente = await registerPaciente(app);

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ senhaAtual: paciente.password, novaSenha: 'novaSenhaForte1', confirmarSenha: 'outraCoisa123' });

    expect(res.status).toBe(400);
  });

  it('senha óbvia (igual ao e-mail) → erro de validação', async () => {
    const paciente = await registerPaciente(app);

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ senhaAtual: paciente.password, novaSenha: paciente.email, confirmarSenha: paciente.email });

    expect(res.status).toBe(400);
  });
});

describe('definir senha — Fluxo 3 (usuário OAuth sem senha local)', () => {
  it('usuário só-Google não exige senha atual e passa a logar por e-mail/senha', async () => {
    const email = `oauth_${Date.now()}@teste.com`;
    const user = await prisma.user.create({
      data: { email, name: 'Usuário Google', role: 'PACIENTE', googleId: 'google-sub-123', password: null },
    });
    const token = signToken(user);

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ novaSenha: 'minhaSenhaNova1', confirmarSenha: 'minhaSenhaNova1' });

    expect(res.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'minhaSenhaNova1' });
    expect(login.status).toBe(200);

    const logs = await prisma.$queryRawUnsafe(
      `SELECT * FROM log_acoes WHERE usuario_id = $1 AND acao = 'PASSWORD_SET'`,
      user.id
    );
    expect(logs.length).toBe(1);
  });
});

describe('alterar senha — farmacêutico (mesmo comportamento do paciente)', () => {
  it('farmacêutico logado altera senha com sucesso', async () => {
    const farm = await registerFarmaceutico(app);
    const email = farm.user.email;

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ senhaAtual: 'senha123', novaSenha: 'novaSenhaForte1', confirmarSenha: 'novaSenhaForte1' });

    expect(res.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'novaSenhaForte1' });
    expect(login.status).toBe(200);
  });

  it('farmacêutico erra a senha atual → erro genérico', async () => {
    const farm = await registerFarmaceutico(app);

    const res = await request(app)
      .post('/api/conta/alterar-senha')
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ senhaAtual: 'senha-errada', novaSenha: 'novaSenhaForte1', confirmarSenha: 'novaSenhaForte1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Senha atual incorreta.');
  });
});
