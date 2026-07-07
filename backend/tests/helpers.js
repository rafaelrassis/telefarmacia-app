import request from 'supertest';

let seq = 0;
const uniqueEmail = (prefix) => `${prefix}${Date.now()}_${seq++}@teste.com`;

// ── Paciente ─────────────────────────────────────────────────────────────────

export async function registerPaciente(app, overrides = {}) {
  const email = overrides.email ?? uniqueEmail('paciente');
  const password = overrides.password ?? 'senha123';
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, nome: overrides.nome ?? 'Paciente Teste' });
  if (res.status !== 201) {
    throw new Error(`registerPaciente falhou (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, email, password };
}

export async function loginPaciente(app, { email, password }) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login falhou (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

// ── Farmacêutico ─────────────────────────────────────────────────────────────
// Registra como paciente e completa o onboarding como FARMACEUTICO (fluxo real
// da API — não há endpoint de registro direto como farmacêutico).

export async function registerFarmaceutico(app, overrides = {}) {
  const { token, user } = await registerPaciente(app, overrides);
  const res = await request(app)
    .put('/api/auth/onboarding')
    .set('Authorization', `Bearer ${token}`)
    .send({
      role: 'FARMACEUTICO',
      crfNumber: overrides.crfNumber ?? '123456',
      crfUF: overrides.crfUF ?? 'SP',
      bio: overrides.bio ?? 'Farmacêutico de teste',
      tags: overrides.tags ?? [],
    });
  if (res.status !== 200) {
    throw new Error(`onboarding farmacêutico falhou (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user, userId: user.id };
}

// Admin de teste — email definido em ADMIN_EMAILS (.env.test).
export async function getAdminToken(app) {
  const email = (process.env.ADMIN_EMAILS || '').split(',')[0].trim();
  if (!email) throw new Error('ADMIN_EMAILS não configurado no .env.test.');
  const { token } = await registerPaciente(app, { email, nome: 'Admin Teste' });
  return token;
}

export async function approveFarmaceutico(app, adminToken, userId) {
  const res = await request(app)
    .patch(`/api/admin/pharmacists/${userId}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
  if (res.status !== 200) {
    throw new Error(`approveFarmaceutico falhou (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export async function setFarmaceuticoOnline(app, farmToken, isOnline = true) {
  const res = await request(app)
    .patch('/api/farmaceuticos/me/disponibilidade')
    .set('Authorization', `Bearer ${farmToken}`)
    .send({ isOnline });
  if (res.status !== 200) {
    throw new Error(`setFarmaceuticoOnline falhou (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// Farmacêutico completo: onboarding + aprovado pelo admin + online + disponível
// para urgências (defaults do schema já cobrem disponivelUrgencias=true).
export async function criarFarmaceuticoAprovado(app, overrides = {}) {
  const adminToken = overrides.adminToken ?? (await getAdminToken(app));
  const farm = await registerFarmaceutico(app, overrides);
  await approveFarmaceutico(app, adminToken, farm.userId);
  if (overrides.online !== false) {
    await setFarmaceuticoOnline(app, farm.token, true);
  }
  return farm;
}

// ── Carteira ─────────────────────────────────────────────────────────────────

export async function creditarCarteira(app, pacienteToken, valor = 200) {
  const res = await request(app)
    .post('/api/creditos/adicionar-teste')
    .set('Authorization', `Bearer ${pacienteToken}`)
    .send({ valor });
  if (res.status !== 200) {
    throw new Error(`creditarCarteira falhou (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.novo_saldo;
}

export async function getSaldo(app, token) {
  const res = await request(app)
    .get('/api/carteira/saldo')
    .set('Authorization', `Bearer ${token}`);
  if (res.status !== 200) {
    throw new Error(`getSaldo falhou (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.saldo_disponivel;
}

// ── Fila agendada ────────────────────────────────────────────────────────────

export async function bookAgendada(app, pacienteToken, overrides = {}) {
  const dataHora = overrides.data_hora ?? amanhaAs('10:00');
  const res = await request(app)
    .post('/api/fila/agendar')
    .set('Authorization', `Bearer ${pacienteToken}`)
    .send({ data_hora: dataHora, ...overrides });
  return res;
}

export async function acceptAgendada(app, farmToken, id) {
  return request(app)
    .post(`/api/fila/agendadas/${id}/aceitar`)
    .set('Authorization', `Bearer ${farmToken}`);
}

export async function cancelarAgendada(app, pacienteToken, id) {
  return request(app)
    .post(`/api/fila/agendadas/${id}/cancelar`)
    .set('Authorization', `Bearer ${pacienteToken}`);
}

// ── Fila urgente ─────────────────────────────────────────────────────────────

export async function bookUrgente(app, pacienteToken, overrides = {}) {
  return request(app)
    .post('/api/fila/urgente')
    .set('Authorization', `Bearer ${pacienteToken}`)
    .send({ ...overrides });
}

export async function acceptUrgente(app, farmToken, id) {
  return request(app)
    .post(`/api/fila/urgente/${id}/aceitar`)
    .set('Authorization', `Bearer ${farmToken}`);
}

export async function cancelarUrgente(app, pacienteToken, id) {
  return request(app)
    .post(`/api/fila/urgente/${id}/cancelar`)
    .set('Authorization', `Bearer ${pacienteToken}`);
}

// ── Ciclo de vida da consulta (farmacêutico) ────────────────────────────────

export async function iniciarConsulta(app, farmToken, id, tipo) {
  return request(app)
    .patch(`/api/consulta/${id}/iniciar`)
    .set('Authorization', `Bearer ${farmToken}`)
    .send({ tipo });
}

export async function concluirConsulta(app, farmToken, id, tipo, overrides = {}) {
  return request(app)
    .patch(`/api/consulta/${id}/concluir`)
    .set('Authorization', `Bearer ${farmToken}`)
    .send({ tipo, observacoes: overrides.observacoes ?? 'Orientações de teste.', ...overrides });
}

// Encadeia agendar → aceitar → iniciar → concluir. Retorna o id da consulta.
export async function criarConsultaAgendadaConcluida(app, { pacienteToken, farmToken, farmUserId }) {
  const book = await bookAgendada(app, pacienteToken);
  if (book.status !== 201) throw new Error(`bookAgendada falhou: ${JSON.stringify(book.body)}`);
  const id = book.body.id;
  const accept = await acceptAgendada(app, farmToken, id);
  if (accept.status !== 200) throw new Error(`acceptAgendada falhou: ${JSON.stringify(accept.body)}`);
  const iniciar = await iniciarConsulta(app, farmToken, id, 'agendada');
  if (iniciar.status !== 200) throw new Error(`iniciarConsulta falhou: ${JSON.stringify(iniciar.body)}`);
  const concluir = await concluirConsulta(app, farmToken, id, 'agendada');
  if (concluir.status !== 200) throw new Error(`concluirConsulta falhou: ${JSON.stringify(concluir.body)}`);
  return id;
}

// ── Datas ────────────────────────────────────────────────────────────────────
// SistemaHorario é semeado 00:00–23:59 todos os dias (ver tests/setup.js), então
// qualquer horário futuro serve — amanhã às HH:mm evita "horário já passou".

export function amanhaAs(hhmm = '10:00') {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${hhmm}:00`;
}
