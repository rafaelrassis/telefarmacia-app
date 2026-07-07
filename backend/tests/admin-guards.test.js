import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  registerPaciente, getAdminToken, creditarCarteira, criarFarmaceuticoAprovado,
  bookAgendada, acceptAgendada, iniciarConsulta, concluirConsulta,
} from './helpers.js';

describe('admin — guard de acesso', () => {
  it('usuário comum → 403 em /api/admin/*', async () => {
    const paciente = await registerPaciente(app);
    const res = await request(app)
      .get('/api/admin/pharmacists')
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(res.status).toBe(403);
  });

  it('email em ADMIN_EMAILS → 200 em /api/admin/*', async () => {
    const adminToken = await getAdminToken(app);
    const res = await request(app)
      .get('/api/admin/pharmacists')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('admin — gestão de admins', () => {
  it('adicionar um e-mail via UI dá acesso de admin a quem se registrar com ele', async () => {
    const adminToken = await getAdminToken(app);
    const novoAdminEmail = `novo_admin_${Date.now()}@teste.com`;

    const add = await request(app)
      .post('/api/admin/admins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: novoAdminEmail });
    expect(add.status).toBe(201);

    const registro = await request(app)
      .post('/api/auth/register')
      .send({ email: novoAdminEmail, password: 'senha123', nome: 'Novo Admin' });
    expect(registro.status).toBe(201);

    const acesso = await request(app)
      .get('/api/admin/pharmacists')
      .set('Authorization', `Bearer ${registro.body.token}`);
    expect(acesso.status).toBe(200);
  });

  it('admin (de config) não consegue remover o próprio acesso', async () => {
    const adminToken = await getAdminToken(app);
    const selfEmail = `self_removal_${Date.now()}@teste.com`;
    await request(app)
      .post('/api/admin/admins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: selfEmail });

    const selfAdmin = await request(app)
      .post('/api/auth/register')
      .send({ email: selfEmail, password: 'senha123', nome: 'Self Admin' });

    const res = await request(app)
      .delete(`/api/admin/admins/${encodeURIComponent(selfEmail)}`)
      .set('Authorization', `Bearer ${selfAdmin.body.token}`);
    expect(res.status).toBe(403);

    const list = await request(app)
      .get('/api/admin/admins')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.some((a) => a.email === selfEmail)).toBe(true);
  });

  it('e-mail definido via ADMIN_EMAILS (env) não pode ser removido pela interface', async () => {
    const adminToken = await getAdminToken(app);
    const outroAdminEmail = `outro_admin_${Date.now()}@teste.com`;
    await request(app)
      .post('/api/admin/admins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: outroAdminEmail });

    const outroAdmin = await request(app)
      .post('/api/auth/register')
      .send({ email: outroAdminEmail, password: 'senha123', nome: 'Outro Admin' });

    // outroAdmin (via config, removível) tenta remover o admin do ADMIN_EMAILS (env)
    const envAdminEmail = (process.env.ADMIN_EMAILS || '').split(',')[0].trim();
    const res = await request(app)
      .delete(`/api/admin/admins/${encodeURIComponent(envAdminEmail)}`)
      .set('Authorization', `Bearer ${outroAdmin.body.token}`);
    expect(res.status).toBe(403);

    const list = await request(app)
      .get('/api/admin/admins')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.some((a) => a.email === envAdminEmail)).toBe(true);
  });
});

describe('IDOR — paciente não acessa recursos de outro paciente', () => {
  it('detalhes, PDF de receita e recibo de outro paciente são bloqueados', async () => {
    const dono = await registerPaciente(app);
    const intruso = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, dono.token, 200);

    const book = await bookAgendada(app, dono.token);
    await acceptAgendada(app, farm.token, book.body.id);
    await iniciarConsulta(app, farm.token, book.body.id, 'agendada');
    await concluirConsulta(app, farm.token, book.body.id, 'agendada');

    const detalhes = await request(app)
      .get(`/api/paciente/consulta/${book.body.id}?tipo=agendada`)
      .set('Authorization', `Bearer ${intruso.token}`);
    expect(detalhes.status).toBe(403);

    const receitaPdf = await request(app)
      .get(`/api/paciente/consulta/${book.body.id}/pdf?tipo=agendada`)
      .set('Authorization', `Bearer ${intruso.token}`);
    expect([403, 404]).toContain(receitaPdf.status);

    const recibo = await request(app)
      .post(`/api/consulta/${book.body.id}/recibo/pdf?tipo=agendada`)
      .set('Authorization', `Bearer ${intruso.token}`);
    expect([403, 404]).toContain(recibo.status);
  });

  it('agendamentos do titular não retornam consultas de outro paciente', async () => {
    const paciente = await registerPaciente(app);
    const outro = await registerPaciente(app);
    await creditarCarteira(app, outro.token, 200);
    const bookOutro = await bookAgendada(app, outro.token);

    const agendamentos = await request(app)
      .get('/api/paciente/agendamentos')
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(agendamentos.status).toBe(200);
    const ids = agendamentos.body.items.map((i) => i.id);
    expect(ids).not.toContain(bookOutro.body.id);
  });
});
