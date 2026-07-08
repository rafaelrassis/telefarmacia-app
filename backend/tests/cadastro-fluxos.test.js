import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  registerPaciente,
  registerFarmaceutico,
  getAdminToken,
  approveFarmaceutico,
} from './helpers.js';

// ── Wizard do farmacêutico: onboarding (conta + dados profissionais) ─────────

describe('onboarding do farmacêutico — validação de CRF/UF compartilhada', () => {
  it('UF inválida → 400', async () => {
    const { token } = await registerPaciente(app);
    const res = await request(app)
      .put('/api/auth/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'FARMACEUTICO', crfNumber: '12345', crfUF: 'XX', bio: '', tags: [] });
    expect(res.status).toBe(400);
  });

  it('número de CRF com letras → 400', async () => {
    const { token } = await registerPaciente(app);
    const res = await request(app)
      .put('/api/auth/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'FARMACEUTICO', crfNumber: 'abc123', crfUF: 'SP', bio: '', tags: [] });
    expect(res.status).toBe(400);
  });

  it('CRF/UF válidos + telefone opcional → 200, telefone e role salvos', async () => {
    const { token } = await registerPaciente(app);
    const res = await request(app)
      .put('/api/auth/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({
        role: 'FARMACEUTICO', crfNumber: '654321', crfUF: 'rj',
        bio: 'Bio de teste', tags: ['diabetes'], phone: '21999998888',
      });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('FARMACEUTICO');
    expect(res.body.user.phone).toBe('21999998888');
    expect(res.body.user.pharmacistProfile.crfUF).toBe('RJ');
    expect(res.body.user.pharmacistProfile.crfNumber).toBe('654321');
  });
});

// ── Wizard do farmacêutico: upload de documentos ─────────────────────────────

describe('cadastroFarmaceutico — upload de documentos', () => {
  it('sem perfil de farmacêutico (onboarding não concluído) → 404', async () => {
    const { token } = await registerPaciente(app);
    const res = await request(app)
      .post('/api/farmaceuticos/cadastro')
      .set('Authorization', `Bearer ${token}`)
      .attach('foto_rg_cnh', Buffer.from('fake-rg'), { filename: 'rg.jpg', contentType: 'image/jpeg' })
      .attach('foto_crf', Buffer.from('fake-crf'), { filename: 'crf.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(404);
  });

  it('faltando um dos arquivos → 400', async () => {
    const farm = await registerFarmaceutico(app);
    const res = await request(app)
      .post('/api/farmaceuticos/cadastro')
      .set('Authorization', `Bearer ${farm.token}`)
      .attach('foto_rg_cnh', Buffer.from('fake-rg'), { filename: 'rg.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('com ambos os arquivos → 201, status Inativo, documentos registrados no perfil', async () => {
    const farm = await registerFarmaceutico(app);
    const res = await request(app)
      .post('/api/farmaceuticos/cadastro')
      .set('Authorization', `Bearer ${farm.token}`)
      .attach('foto_rg_cnh', Buffer.from('fake-rg'), { filename: 'rg.jpg', contentType: 'image/jpeg' })
      .attach('foto_crf', Buffer.from('fake-crf'), { filename: 'crf.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Inativo');

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${farm.token}`);
    expect(me.body.pharmacistProfile.urlDocIdentidade).toMatch(/^\/uploads\//);
    expect(me.body.pharmacistProfile.urlDocCrf).toMatch(/^\/uploads\//);
  });
});

// ── Consolidação do status: aprovação/suspensão + notificação única ─────────

describe('setStatus — aprovação e notificação de conta aprovada', () => {
  it('aprovar farmacêutico pendente cria notificação "conta_aprovada"', async () => {
    const adminToken = await getAdminToken(app);
    const farm = await registerFarmaceutico(app);

    await approveFarmaceutico(app, adminToken, farm.userId);

    const notifs = await request(app)
      .get('/api/paciente/notificacoes')
      .set('Authorization', `Bearer ${farm.token}`);
    expect(notifs.status).toBe(200);
    const aprovacoes = notifs.body.notificacoes.filter((n) => n.tipo === 'conta_aprovada');
    expect(aprovacoes.length).toBe(1);
  });

  it('reativar um farmacêutico já aprovado não duplica a notificação', async () => {
    const adminToken = await getAdminToken(app);
    const farm = await registerFarmaceutico(app);

    await approveFarmaceutico(app, adminToken, farm.userId);
    // segunda ativação (ex.: reverter uma suspensão de volta para Ativo)
    await approveFarmaceutico(app, adminToken, farm.userId);

    const notifs = await request(app)
      .get('/api/paciente/notificacoes')
      .set('Authorization', `Bearer ${farm.token}`);
    const aprovacoes = notifs.body.notificacoes.filter((n) => n.tipo === 'conta_aprovada');
    expect(aprovacoes.length).toBe(1);
  });

  it('status inválido → 400', async () => {
    const adminToken = await getAdminToken(app);
    const farm = await registerFarmaceutico(app);
    const res = await request(app)
      .patch(`/api/admin/farmaceuticos/${farm.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Suspenso' });
    expect(res.status).toBe(400);
  });

  it('suspender (Inativo) um farmacêutico aprovado zera isApproved sem nova notificação', async () => {
    const adminToken = await getAdminToken(app);
    const farm = await registerFarmaceutico(app);
    await approveFarmaceutico(app, adminToken, farm.userId);

    const suspensao = await request(app)
      .patch(`/api/admin/farmaceuticos/${farm.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inativo' });
    expect(suspensao.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${farm.token}`);
    expect(me.body.pharmacistProfile.isApproved).toBe(false);

    const notifs = await request(app)
      .get('/api/paciente/notificacoes')
      .set('Authorization', `Bearer ${farm.token}`);
    const aprovacoes = notifs.body.notificacoes.filter((n) => n.tipo === 'conta_aprovada');
    expect(aprovacoes.length).toBe(1);
  });
});

// ── Onboarding de saúde adiável do paciente ──────────────────────────────────

// Gera um CPF numericamente válido (dígitos verificadores corretos), único a
// cada chamada — necessário porque PacienteProfile.cpf tem constraint unique.
function gerarCpfValido() {
  const calcDigito = (nums) => {
    const factor = nums.length + 1;
    const sum = nums.reduce((acc, d, i) => acc + d * (factor - i), 0);
    const rem = (sum * 10) % 11;
    return rem >= 10 ? 0 : rem;
  };
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  n.push(calcDigito(n));
  n.push(calcDigito(n));
  return n.join('');
}

async function criarPerfilPaciente(token) {
  const res = await request(app)
    .post('/api/pacientes/perfil')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nome_completo: 'Paciente Dados Saúde',
      data_nascimento: '1990-01-01',
      genero: 'Feminino',
      cpf: gerarCpfValido(),
      aceite_termos: true,
    });
  if (res.status !== 201) throw new Error(`criarPerfilPaciente falhou (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

describe('dados de saúde do titular', () => {
  it('GET sem dados prévios retorna objeto vazio', async () => {
    const { token } = await registerPaciente(app);
    await criarPerfilPaciente(token);
    const res = await request(app)
      .get('/api/pacientes/dados-saude')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.dadosSaude).toEqual({});
  });

  it('PATCH salva e GET reflete os dados', async () => {
    const { token } = await registerPaciente(app);
    await criarPerfilPaciente(token);
    const salvar = await request(app)
      .patch('/api/pacientes/dados-saude')
      .set('Authorization', `Bearer ${token}`)
      .send({ dadosSaude: { peso: 70.5, altura: 175, alergias: 'dipirona' } });
    expect(salvar.status).toBe(200);

    const buscar = await request(app)
      .get('/api/pacientes/dados-saude')
      .set('Authorization', `Bearer ${token}`);
    expect(buscar.body.dadosSaude).toEqual({ peso: 70.5, altura: 175, alergias: 'dipirona' });
  });
});

describe('dados de saúde de dependente', () => {
  const criarDependente = async (token, overrides = {}) => {
    const res = await request(app)
      .post('/api/dependentes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: overrides.nome ?? 'Dependente Teste',
        dataNascimento: overrides.dataNascimento ?? '2015-05-10',
        sexo: overrides.sexo ?? 'F',
        parentesco: overrides.parentesco ?? 'Filho(a)',
        aceitouResponsabilidade: true,
      });
    if (res.status !== 201) throw new Error(`criarDependente falhou (${res.status}): ${JSON.stringify(res.body)}`);
    return res.body;
  };

  it('GET sem dados prévios retorna objeto vazio', async () => {
    const { token } = await registerPaciente(app);
    const dep = await criarDependente(token);

    const res = await request(app)
      .get(`/api/dependentes/${dep.id}/saude`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.dadosSaude).toEqual({});
  });

  it('PATCH salva e GET reflete os dados do dependente', async () => {
    const { token } = await registerPaciente(app);
    const dep = await criarDependente(token);

    const salvar = await request(app)
      .patch(`/api/dependentes/${dep.id}/saude`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dadosSaude: { peso: 22, altura: 110 } });
    expect(salvar.status).toBe(200);

    const buscar = await request(app)
      .get(`/api/dependentes/${dep.id}/saude`)
      .set('Authorization', `Bearer ${token}`);
    expect(buscar.body.dadosSaude).toEqual({ peso: 22, altura: 110 });
  });

  it('dependente de outro titular → 404', async () => {
    const dono = await registerPaciente(app);
    const outro = await registerPaciente(app);
    const dep = await criarDependente(dono.token);

    const res = await request(app)
      .get(`/api/dependentes/${dep.id}/saude`)
      .set('Authorization', `Bearer ${outro.token}`);
    expect(res.status).toBe(404);
  });
});
