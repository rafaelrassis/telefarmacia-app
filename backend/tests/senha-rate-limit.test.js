import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './db.js';
import { registerPaciente } from './helpers.js';

// Arquivo isolado: o rate limiter de /api/auth/esqueci-senha (3/hora, por
// e-mail e por IP) mantém estado em memória durante todo o arquivo — os
// outros testes de senha usam inserção direta no banco para não consumir
// essa cota, deixando o orçamento inteiro disponível aqui.
describe('esqueci minha senha — rate limiting (3/hora por e-mail e por IP)', () => {
  it('4ª solicitação seguida para o mesmo e-mail é bloqueada silenciosamente', async () => {
    const paciente = await registerPaciente(app);

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/auth/esqueci-senha').send({ email: paciente.email });
      expect(res.status).toBe(200);
    }
    // Cada solicitação bem-sucedida invalida o token anterior e cria um novo
    // — 3 chamadas → 3 registros (2 invalidados + 1 ativo).
    const contagemAposTres = await prisma.passwordReset.count({ where: { userId: paciente.user.id } });
    expect(contagemAposTres).toBe(3);

    const quarta = await request(app).post('/api/auth/esqueci-senha').send({ email: paciente.email });
    expect(quarta.status).toBe(200);
    expect(quarta.body.message).toBe('Se este e-mail estiver cadastrado, enviamos um link de redefinição.');

    // Bloqueada pelo rate limit antes de chegar à lógica da rota — nenhum
    // registro novo é criado na 4ª chamada.
    const contagemAposQuarta = await prisma.passwordReset.count({ where: { userId: paciente.user.id } });
    expect(contagemAposQuarta).toBe(3);
  });
});
