import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './db.js';

// Mock do client OAuth do Google — o "idToken" enviado nos testes já é o
// payload serializado (name/email/sub), e o mock só devolve esse payload
// direto, sem validar assinatura de verdade (mesmo padrão de
// confirmacao-email.test.js).
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    async verifyIdToken({ idToken }) {
      return { getPayload: () => JSON.parse(idToken) };
    }
  },
}));

const uniqueEmail = (prefix) => `${prefix}${Date.now()}_${Math.random().toString(36).slice(2)}@teste.com`;

describe('login Google — inclusão de perfil na resposta (Correção 8)', () => {
  it('paciente com perfil existente que loga via Google recebe user.pacienteProfile preenchido', async () => {
    const email = uniqueEmail('google-com-perfil');
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Paciente Google',
        role: 'PACIENTE',
        googleId: 'sub-existente',
        emailVerified: new Date(),
        pacienteProfile: {
          create: {
            nomeCompleto: 'Paciente Google Teste',
            dataNascimento: new Date('1990-01-01'),
            genero: 'Feminino',
            cpf: `${Date.now()}`.slice(-11),
            aceiteTermos: true,
            dataAceite: new Date(),
            versaoTermos: '1.0',
            onboardingConcluido: true,
          },
        },
      },
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: JSON.stringify({ email, name: 'Paciente Google', sub: 'sub-existente' }) });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.pacienteProfile).not.toBeNull();
    expect(res.body.user.pacienteProfile.nomeCompleto).toBe('Paciente Google Teste');
    expect(res.body.user.password).toBeUndefined();
  });

  it('usuário Google novo continua funcionando, sem pacienteProfile', async () => {
    const email = uniqueEmail('google-novo');

    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: JSON.stringify({ email, name: 'Usuário Google Novo', sub: 'sub-novo' }) });

    expect(res.status).toBe(200);
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user.pacienteProfile).toBeFalsy();
    expect(res.body.user.password).toBeUndefined();
  });
});
