import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './db.js';
import { hashVerificationToken } from '../src/utils/emailVerificationToken.js';
import { jobExcluirCadastrosNaoConfirmados } from '../src/cronJobs.js';
import { registerPaciente } from './helpers.js';

// Mock do client OAuth do Google — os testes de login Google enviam o
// "idToken" já como o payload serializado (name/email/sub), e o mock só
// devolve esse payload direto, sem validar assinatura de verdade. O Vitest
// eleva (hoist) esta chamada para antes dos imports acima, então o mock já
// está em vigor quando AuthController.js instancia o OAuth2Client.
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    async verifyIdToken({ idToken }) {
      return { getPayload: () => JSON.parse(idToken) };
    }
  },
}));

const uniqueEmail = (prefix) => `${prefix}${Date.now()}_${Math.random().toString(36).slice(2)}@teste.com`;
const passado25h = () => new Date(Date.now() - 25 * 60 * 60 * 1000);

// Registra sem confirmar — ao contrário de registerPaciente (que já marca
// emailVerified para não afetar os demais testes do projeto), aqui o estado
// não confirmado é o próprio objeto de teste.
async function registrarNaoConfirmado(overrides = {}) {
  const email = overrides.email ?? uniqueEmail('naoconfirmado');
  const password = overrides.password ?? 'senha123';
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, nome: overrides.nome ?? 'Paciente Pendente' });
  if (res.status !== 201) throw new Error(`registro falhou (${res.status}): ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, email, password };
}

const criarTokenConfirmacao = async (userId, { expiresAt } = {}) => {
  const token = `token-plano-${Date.now()}-${Math.random()}`;
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hashVerificationToken(token),
      expiresAt: expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
};

describe('cadastro por credenciais — Fluxo 1', () => {
  it('cria usuário com emailVerified nulo e um token de confirmação válido por 24h a partir do createdAt', async () => {
    const { user } = await registrarNaoConfirmado();
    expect(user.emailVerified).toBeNull();

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const tokens = await prisma.verificationToken.findMany({ where: { userId: user.id } });
    expect(tokens.length).toBe(1);

    const janelaEsperada = dbUser.createdAt.getTime() + 24 * 60 * 60 * 1000;
    expect(Math.abs(tokens[0].expiresAt.getTime() - janelaEsperada)).toBeLessThan(5000);
  });
});

describe('login bloqueado — Fluxo 3', () => {
  it('login com e-mail não confirmado → 403 EMAIL_NOT_VERIFIED', async () => {
    const { email, password } = await registrarNaoConfirmado();

    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('senha errada em conta não confirmada continua 401 (não vaza o estado de confirmação)', async () => {
    const { email } = await registrarNaoConfirmado();

    const res = await request(app).post('/api/auth/login').send({ email, password: 'senhaerrada' });
    expect(res.status).toBe(401);
  });
});

describe('confirmar e-mail — Fluxo 2', () => {
  it('token válido dentro do prazo → confirma e libera login', async () => {
    const { user, email, password } = await registrarNaoConfirmado();
    const token = await criarTokenConfirmacao(user.id);

    const res = await request(app).post('/api/auth/confirmar-email').send({ token });
    expect(res.status).toBe(200);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser.emailVerified).not.toBeNull();

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
  });

  it('token expirado → erro claro, conta continua não confirmada', async () => {
    const { user } = await registrarNaoConfirmado();
    const token = await criarTokenConfirmacao(user.id, { expiresAt: new Date(Date.now() - 60 * 1000) });

    const res = await request(app).post('/api/auth/confirmar-email').send({ token });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Link inválido ou expirado.');

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser.emailVerified).toBeNull();
  });

  it('token inexistente → erro claro', async () => {
    const res = await request(app).post('/api/auth/confirmar-email').send({ token: 'token-que-nao-existe' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Link inválido ou expirado.');
  });

  it('usado duas vezes → segunda tentativa cai na idempotência, sem erro', async () => {
    const { user } = await registrarNaoConfirmado();
    const token = await criarTokenConfirmacao(user.id);

    const primeira = await request(app).post('/api/auth/confirmar-email').send({ token });
    expect(primeira.status).toBe(200);

    const segunda = await request(app).post('/api/auth/confirmar-email').send({ token });
    expect(segunda.status).toBe(200);
    expect(segunda.body.message).toMatch(/já confirmado/);
  });
});

describe('reenviar confirmação — Fluxo 3', () => {
  it('conta pendente → invalida token anterior e gera um novo, sem estender o prazo de exclusão', async () => {
    const { user, email } = await registrarNaoConfirmado();
    const tokenAntigo = await prisma.verificationToken.findFirst({ where: { userId: user.id } });

    const res = await request(app).post('/api/auth/reenviar-confirmacao').send({ email });
    expect(res.status).toBe(200);

    const tokensDepois = await prisma.verificationToken.findMany({ where: { userId: user.id } });
    expect(tokensDepois.length).toBe(1);
    expect(tokensDepois[0].tokenHash).not.toBe(tokenAntigo.tokenHash);

    // Ancorado em User.createdAt (não em "agora") — reenviar não empurra o
    // prazo de exclusão automática para mais longe.
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const janelaEsperada = dbUser.createdAt.getTime() + 24 * 60 * 60 * 1000;
    expect(Math.abs(tokensDepois[0].expiresAt.getTime() - janelaEsperada)).toBeLessThan(5000);
  });

  it('e-mail não cadastrado → mesma mensagem genérica, nenhum efeito', async () => {
    const res = await request(app)
      .post('/api/auth/reenviar-confirmacao')
      .send({ email: uniqueEmail('inexistente') });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/estiver cadastrado/);
  });

  it('conta já confirmada → mesma resposta genérica, nenhum token novo criado', async () => {
    const paciente = await registerPaciente(app);
    const antes = await prisma.verificationToken.count({ where: { userId: paciente.user.id } });

    const res = await request(app).post('/api/auth/reenviar-confirmacao').send({ email: paciente.email });
    expect(res.status).toBe(200);

    const depois = await prisma.verificationToken.count({ where: { userId: paciente.user.id } });
    expect(depois).toBe(antes);
  });

  // A janela de 1/minuto é a única testável de forma confiável em um teste
  // automatizado (roda em milissegundos); o teto de 5/hora usa a mesma
  // implementação (express-rate-limit em série, ver
  // middlewares/emailConfirmationLimiter.js) e não é reexercitado aqui pelos
  // mesmos motivos documentados em senha-rate-limit.test.js.
  it('reenviar 2x em menos de 1 minuto → segunda tentativa é bloqueada silenciosamente', async () => {
    const { user, email } = await registrarNaoConfirmado();

    const primeiro = await request(app).post('/api/auth/reenviar-confirmacao').send({ email });
    expect(primeiro.status).toBe(200);
    expect(await prisma.verificationToken.count({ where: { userId: user.id } })).toBe(1);

    const segundo = await request(app).post('/api/auth/reenviar-confirmacao').send({ email });
    expect(segundo.status).toBe(200);
    // Bloqueado pelo rate limit antes de chegar à lógica da rota — nenhum
    // token novo é gerado.
    expect(await prisma.verificationToken.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe('login Google — emailVerified automático', () => {
  it('novo usuário via Google → emailVerified já preenchido no primeiro login', async () => {
    const email = uniqueEmail('google');
    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: JSON.stringify({ email, name: 'Usuário Google', sub: 'sub-1' }) });

    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).not.toBeNull();
  });

  it('cadastro por credenciais pendente + login Google com o mesmo e-mail → confirma a conta existente', async () => {
    const { email, user } = await registrarNaoConfirmado();

    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: JSON.stringify({ email, name: 'Usuário Google', sub: 'sub-2' }) });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser.emailVerified).not.toBeNull();
  });
});

describe('exclusão automática de cadastros não confirmados — Fluxo 4 (invocação direta do job)', () => {
  it('não confirmado há mais de 24h, sem movimento → excluído (tokens em cascata)', async () => {
    const { user } = await registrarNaoConfirmado();
    await prisma.user.update({ where: { id: user.id }, data: { createdAt: passado25h() } });

    await jobExcluirCadastrosNaoConfirmados();

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.verificationToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it('não confirmado há menos de 24h → intocado', async () => {
    const { user } = await registrarNaoConfirmado();

    await jobExcluirCadastrosNaoConfirmados();

    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it('confirmado, mesmo criado há muito tempo → nunca excluído', async () => {
    const paciente = await registerPaciente(app);
    await prisma.user.update({ where: { id: paciente.user.id }, data: { createdAt: passado25h() } });

    await jobExcluirCadastrosNaoConfirmados();

    expect(await prisma.user.findUnique({ where: { id: paciente.user.id } })).not.toBeNull();
  });

  it('conta Google nunca é excluída, mesmo com emailVerified nulo por algum motivo', async () => {
    // Defesa em profundidade: googleId por si só já tira a conta do filtro
    // do job, mesmo que emailVerified estivesse (hipoteticamente) nulo.
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail('google-antigo'), name: 'Google Antigo', role: 'PACIENTE',
        googleId: 'sub-old', emailVerified: null, createdAt: passado25h(),
      },
    });

    await jobExcluirCadastrosNaoConfirmados();

    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it('paciente não confirmado com pagamento → protegido, não excluído', async () => {
    const { user } = await registrarNaoConfirmado();
    await prisma.user.update({ where: { id: user.id }, data: { createdAt: passado25h() } });
    await prisma.pagamento.create({
      data: { pacienteId: user.id, valor: 50, status: 'Pendente', qrCodeMock: 'mock' },
    });

    await jobExcluirCadastrosNaoConfirmados();

    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });
});
