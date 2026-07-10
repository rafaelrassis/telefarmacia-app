import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  registerPaciente,
  criarFarmaceuticoAprovado,
  bookAgendada,
  acceptAgendada,
  creditarCarteira,
} from './helpers.js';

const jpeg = () => Buffer.from('fake-jpeg-bytes');

describe('anexo de receita (interpretação de receita)', () => {
  it('paciente dono envia anexo → 200, URL retornada, e consegue baixá-lo depois', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    expect(book.status).toBe(201);
    const id = book.body.id;

    const upload = await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=agendada`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .attach('anexo', jpeg(), { filename: 'receita.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(200);
    expect(upload.body.anexoReceitaUrl).toMatch(/^\/uploads\/anexos\/anexo-receita-.+\.jpg$/);

    const download = await request(app)
      .get(upload.body.anexoReceitaUrl)
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('image/jpeg');
  });

  it('sem arquivo anexado → 400', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    const upload = await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=agendada`)
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(upload.status).toBe(400);
  });

  it('tipo inválido → 400', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    const upload = await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=outro`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .attach('anexo', jpeg(), { filename: 'receita.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(400);
  });

  it('outro paciente (não dono) não pode enviar anexo → 403', async () => {
    const dono  = await registerPaciente(app);
    const outro = await registerPaciente(app);
    await creditarCarteira(app, dono.token, 200);
    const book = await bookAgendada(app, dono.token);
    const id = book.body.id;

    const upload = await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=agendada`)
      .set('Authorization', `Bearer ${outro.token}`)
      .attach('anexo', jpeg(), { filename: 'receita.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(403);
  });

  it('outro paciente (não dono) não pode baixar o anexo → 403', async () => {
    const dono  = await registerPaciente(app);
    const outro = await registerPaciente(app);
    await creditarCarteira(app, dono.token, 200);
    const book = await bookAgendada(app, dono.token);
    const id = book.body.id;

    const upload = await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=agendada`)
      .set('Authorization', `Bearer ${dono.token}`)
      .attach('anexo', jpeg(), { filename: 'receita.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(200);

    const download = await request(app)
      .get(upload.body.anexoReceitaUrl)
      .set('Authorization', `Bearer ${outro.token}`);
    expect(download.status).toBe(403);
  });

  it('farmacêutico responsável pela consulta pode baixar o anexo', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    const upload = await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=agendada`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .attach('anexo', jpeg(), { filename: 'receita.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(200);

    const accept = await acceptAgendada(app, farm.token, id);
    expect(accept.status).toBe(200);

    const download = await request(app)
      .get(upload.body.anexoReceitaUrl)
      .set('Authorization', `Bearer ${farm.token}`);
    expect(download.status).toBe(200);
  });

  it('farmacêutico sem relação com a consulta não pode baixar o anexo → 403', async () => {
    const paciente = await registerPaciente(app);
    const farmAlheio = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    const upload = await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=agendada`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .attach('anexo', jpeg(), { filename: 'receita.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(200);

    const download = await request(app)
      .get(upload.body.anexoReceitaUrl)
      .set('Authorization', `Bearer ${farmAlheio.token}`);
    expect(download.status).toBe(403);
  });

  it('GET /api/consulta/:id do farmacêutico expõe anexoReceitaUrl após o aceite', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    await request(app)
      .post(`/api/consulta/${id}/anexo-receita?tipo=agendada`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .attach('anexo', jpeg(), { filename: 'receita.jpg', contentType: 'image/jpeg' });

    await acceptAgendada(app, farm.token, id);

    const detalhe = await request(app)
      .get(`/api/consulta/${id}?tipo=agendada`)
      .set('Authorization', `Bearer ${farm.token}`);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.anexoReceitaUrl).toMatch(/^\/uploads\/anexos\//);
  });
});
