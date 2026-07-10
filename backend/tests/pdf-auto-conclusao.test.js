import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  registerPaciente,
  criarFarmaceuticoAprovado,
  creditarCarteira,
  bookAgendada,
  acceptAgendada,
  iniciarConsulta,
  concluirConsulta,
} from './helpers.js';

describe('PDF automático na conclusão da consulta', () => {
  it('conclusão com receita preenchida gera o PDF automaticamente', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    await acceptAgendada(app, farm.token, id);
    await iniciarConsulta(app, farm.token, id, 'agendada');

    const concluir = await concluirConsulta(app, farm.token, id, 'agendada', {
      receita: [{ medicamento: 'Dipirona', dosagem: '500mg', posologia: '1 comp. de 8/8h', duracao: '5 dias' }],
    });
    expect(concluir.status).toBe(200);

    const detalhe = await request(app)
      .get(`/api/consulta/${id}?tipo=agendada`)
      .set('Authorization', `Bearer ${farm.token}`);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.receitaPdfUrl).toMatch(new RegExp(`^/uploads/receitas/receita-${id}\\.pdf$`));

    const download = await request(app)
      .get(detalhe.body.receitaPdfUrl)
      .set('Authorization', `Bearer ${farm.token}`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/pdf');
  });

  it('conclusão sem receita não gera PDF, mas conclui normalmente', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    await acceptAgendada(app, farm.token, id);
    await iniciarConsulta(app, farm.token, id, 'agendada');

    const concluir = await concluirConsulta(app, farm.token, id, 'agendada');
    expect(concluir.status).toBe(200);

    const detalhe = await request(app)
      .get(`/api/consulta/${id}?tipo=agendada`)
      .set('Authorization', `Bearer ${farm.token}`);
    expect(detalhe.body.receitaPdfUrl).toBeNull();
    expect(detalhe.body.status).toBe('concluido');
  });

  it('botão manual "Gerar PDF" continua funcionando após a conclusão (re-gerar)', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const id = book.body.id;

    await acceptAgendada(app, farm.token, id);
    await iniciarConsulta(app, farm.token, id, 'agendada');
    await concluirConsulta(app, farm.token, id, 'agendada', {
      receita: [{ medicamento: 'Paracetamol', dosagem: '750mg' }],
    });

    const regerar = await request(app)
      .post(`/api/consulta/${id}/receita/pdf`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'agendada' });
    expect(regerar.status).toBe(200);
    expect(regerar.body.url).toMatch(new RegExp(`^/uploads/receitas/receita-${id}\\.pdf$`));
  });
});
