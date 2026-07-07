import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './db.js';
import {
  registerPaciente, registerFarmaceutico, criarFarmaceuticoAprovado, getAdminToken,
  approveFarmaceutico, setFarmaceuticoOnline, creditarCarteira, bookAgendada,
  acceptAgendada, iniciarConsulta, concluirConsulta,
} from './helpers.js';

describe('fila agendada — fluxo feliz', () => {
  it('agendar → aceitar (grava farmaceuticoId e aceitoEm) → iniciar → concluir → avaliar', async () => {
    const paciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);

    const book = await bookAgendada(app, paciente.token);
    expect(book.status).toBe(201);

    const accept = await acceptAgendada(app, farm.token, book.body.id);
    expect(accept.status).toBe(200);
    const fila = await prisma.filaAgendada.findUnique({ where: { id: book.body.id } });
    expect(fila.farmaceuticoId).toBe(farm.userId);
    expect(fila.aceitoEm).not.toBeNull();
    expect(fila.status).toBe('aceito');

    const iniciar = await iniciarConsulta(app, farm.token, book.body.id, 'agendada');
    expect(iniciar.status).toBe(200);

    const concluir = await concluirConsulta(app, farm.token, book.body.id, 'agendada');
    expect(concluir.status).toBe(200);

    const avaliar = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ consulta_id: book.body.id, tipo: 'agendada', nota: 5, comentario: 'Ótimo atendimento' });
    expect(avaliar.status).toBe(201);

    const avaliarDeNovo = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ consulta_id: book.body.id, tipo: 'agendada', nota: 4 });
    expect(avaliarDeNovo.status).toBeGreaterThanOrEqual(400);
    expect(avaliarDeNovo.status).toBeLessThan(500);
  });

  // BUG REAL reportado ao usuário: aceitarAgendada/aceitarUrgente (FilaController.js)
  // checam apenas req.user.role === 'FARMACEUTICO', sem checar isApproved/isSuspended
  // do PharmacistProfile. Um farmacêutico nunca aprovado (ou suspenso) hoje CONSEGUE
  // aceitar consultas via API direta. Mantido .skip (não "consertado para passar")
  // até decisão do usuário — ver relatório enviado antes desta fase.
  it.skip('farmacêutico não aprovado não consegue aceitar → 403 (BUG: hoje aceita)', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);

    const farmNaoAprovado = await registerFarmaceutico(app);
    const accept = await acceptAgendada(app, farmNaoAprovado.token, book.body.id);
    expect(accept.status).toBe(403);
  });

  it.skip('farmacêutico suspenso não consegue aceitar → 403 (BUG: hoje aceita)', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);

    const farm = await criarFarmaceuticoAprovado(app);
    await prisma.pharmacistProfile.update({ where: { userId: farm.userId }, data: { isSuspended: true } });

    const accept = await acceptAgendada(app, farm.token, book.body.id);
    expect(accept.status).toBe(403);
  });
});

describe('fila agendada — corrida de aceite', () => {
  it('dois farmacêuticos aceitando a mesma consulta: o segundo recebe erro e o vínculo não muda', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);

    const farm1 = await criarFarmaceuticoAprovado(app);
    const farm2 = await criarFarmaceuticoAprovado(app);

    const accept1 = await acceptAgendada(app, farm1.token, book.body.id);
    expect(accept1.status).toBe(200);

    const accept2 = await acceptAgendada(app, farm2.token, book.body.id);
    expect(accept2.status).toBe(409);

    const fila = await prisma.filaAgendada.findUnique({ where: { id: book.body.id } });
    expect(fila.farmaceuticoId).toBe(farm1.userId);
  });
});

describe('fila agendada — devolução e sem-contato', () => {
  it('devolução volta a aguardando sem farmacêutico', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const farm = await criarFarmaceuticoAprovado(app);
    await acceptAgendada(app, farm.token, book.body.id);

    const devolver = await request(app)
      .patch(`/api/consulta/${book.body.id}/devolver`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'agendada', motivo: 'Imprevisto' });
    expect(devolver.status).toBe(200);

    const fila = await prisma.filaAgendada.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('aguardando');
    expect(fila.farmaceuticoId).toBeNull();
  });

  it('sem-contato cancela a consulta e devolve o crédito', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const book = await bookAgendada(app, paciente.token);
    const farm = await criarFarmaceuticoAprovado(app);
    await acceptAgendada(app, farm.token, book.body.id);

    const semContato = await request(app)
      .patch(`/api/consulta/${book.body.id}/sem-contato`)
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ tipo: 'agendada' });
    expect(semContato.status).toBe(200);

    const fila = await prisma.filaAgendada.findUnique({ where: { id: book.body.id } });
    expect(fila.status).toBe('cancelado');

    const saldo = await request(app)
      .get('/api/carteira/saldo')
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(saldo.body.saldo_disponivel).toBe(200);
  });
});

describe('fila agendada — remarcação', () => {
  it('paciente remarca respeitando o limite e notifica o farmacêutico vinculado', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const farm = await criarFarmaceuticoAprovado(app);

    const daquiA5Dias = new Date(Date.now() + 5 * 86400000);
    const dataHora = `${daquiA5Dias.toISOString().slice(0, 10)}T10:00:00`;
    const book = await bookAgendada(app, paciente.token, { data_hora: dataHora });
    await acceptAgendada(app, farm.token, book.body.id);

    const novaData = new Date(Date.now() + 6 * 86400000);
    const nova_data_hora = `${novaData.toISOString().slice(0, 10)}T11:00:00-03:00`;

    const remarcar1 = await request(app)
      .patch(`/api/consulta/${book.body.id}/remarcar`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ nova_data_hora });
    expect(remarcar1.status).toBe(200);
    expect(remarcar1.body.remarcacoes).toBe(1);

    const notificacoes = await prisma.notificacao.findMany({
      where: { userId: farm.userId, consultaId: book.body.id },
    });
    expect(notificacoes.some((n) => n.tipo === 'consulta_remarcada_paciente')).toBe(true);

    const novaData2 = new Date(Date.now() + 7 * 86400000);
    const remarcar2 = await request(app)
      .patch(`/api/consulta/${book.body.id}/remarcar`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ nova_data_hora: `${novaData2.toISOString().slice(0, 10)}T11:00:00-03:00` });
    expect(remarcar2.status).toBe(200);
    expect(remarcar2.body.remarcacoes).toBe(2);

    const novaData3 = new Date(Date.now() + 8 * 86400000);
    const remarcar3 = await request(app)
      .patch(`/api/consulta/${book.body.id}/remarcar`)
      .set('Authorization', `Bearer ${paciente.token}`)
      .send({ nova_data_hora: `${novaData3.toISOString().slice(0, 10)}T11:00:00-03:00` });
    expect(remarcar3.status).toBe(400);
  });
});

describe('fila agendada — bloqueio de agenda', () => {
  it('bloqueio de agenda impede aceite no horário bloqueado', async () => {
    const farm = await criarFarmaceuticoAprovado(app);

    const inicio = new Date(Date.now() + 3 * 86400000);
    inicio.setHours(8, 0, 0, 0);
    const fim = new Date(inicio.getTime() + 4 * 3600 * 1000);

    const bloqueio = await request(app)
      .post('/api/farmaceutico/bloqueios')
      .set('Authorization', `Bearer ${farm.token}`)
      .send({ dataInicio: inicio.toISOString(), dataFim: fim.toISOString(), motivo: 'Férias' });
    expect(bloqueio.status).toBe(201);

    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const dataHoraBloqueada = new Date(inicio.getTime() + 3600 * 1000);
    const book = await bookAgendada(app, paciente.token, {
      data_hora: dataHoraBloqueada.toISOString().slice(0, 19),
    });
    expect(book.status).toBe(201);

    const accept = await acceptAgendada(app, farm.token, book.body.id);
    expect(accept.status).toBe(409);
  });
});

describe('fila agendada — recibo em PDF', () => {
  it('dono + concluída → 200 PDF; outro paciente → não acessa; não concluída → 4xx', async () => {
    const paciente = await registerPaciente(app);
    const outroPaciente = await registerPaciente(app);
    const farm = await criarFarmaceuticoAprovado(app);
    await creditarCarteira(app, paciente.token, 200);

    const book = await bookAgendada(app, paciente.token);
    await acceptAgendada(app, farm.token, book.body.id);

    const reciboNaoConcluida = await request(app)
      .post(`/api/consulta/${book.body.id}/recibo/pdf?tipo=agendada`)
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(reciboNaoConcluida.status).toBeGreaterThanOrEqual(400);
    expect(reciboNaoConcluida.status).toBeLessThan(500);

    await iniciarConsulta(app, farm.token, book.body.id, 'agendada');
    await concluirConsulta(app, farm.token, book.body.id, 'agendada');

    const reciboOutro = await request(app)
      .post(`/api/consulta/${book.body.id}/recibo/pdf?tipo=agendada`)
      .set('Authorization', `Bearer ${outroPaciente.token}`);
    expect([403, 404]).toContain(reciboOutro.status);

    const recibo = await request(app)
      .post(`/api/consulta/${book.body.id}/recibo/pdf?tipo=agendada`)
      .set('Authorization', `Bearer ${paciente.token}`);
    expect(recibo.status).toBe(200);
    expect(recibo.headers['content-type']).toMatch(/pdf/);
  });
});

describe('fila agendada — histórico do paciente no atendimento', () => {
  it('farmacêutico da consulta acessa; outro farmacêutico sem vínculo → 403', async () => {
    const paciente = await registerPaciente(app);
    await creditarCarteira(app, paciente.token, 200);
    const farm = await criarFarmaceuticoAprovado(app);
    const outroFarm = await criarFarmaceuticoAprovado(app);

    const book = await bookAgendada(app, paciente.token);
    await acceptAgendada(app, farm.token, book.body.id);
    await iniciarConsulta(app, farm.token, book.body.id, 'agendada');
    await concluirConsulta(app, farm.token, book.body.id, 'agendada');

    const historico = await request(app)
      .get(`/api/paciente/${paciente.user.id}/historico`)
      .set('Authorization', `Bearer ${farm.token}`);
    expect(historico.status).toBe(200);

    const historicoOutro = await request(app)
      .get(`/api/paciente/${paciente.user.id}/historico`)
      .set('Authorization', `Bearer ${outroFarm.token}`);
    expect(historicoOutro.status).toBe(403);
  });

  // BUG REAL reportado ao usuário: getHistoricoPaciente (ConsultaController.js)
  // autoriza o acesso checando apenas se o farmacêutico tem QUALQUER vínculo
  // com o pacienteId (titular), mas depois retorna TODAS as consultas desse
  // pacienteId sem filtrar por dependentId — um farmacêutico que tratou só o
  // dependente A enxerga também as consultas do dependente B e do titular.
  // Confirmado rodando este teste (falha reproduzida). Mantido .skip até
  // decisão do usuário — não "consertado para passar".
  it.skip('BUG REAL: histórico do titular vaza consultas de um dependente não tratado pelo farmacêutico', async () => {
    const titular = await registerPaciente(app);
    await creditarCarteira(app, titular.token, 400);

    const depA = await request(app)
      .post('/api/dependentes')
      .set('Authorization', `Bearer ${titular.token}`)
      .send({ nome: 'Dependente A', dataNascimento: '2010-01-01', sexo: 'feminino', aceitouResponsabilidade: true });
    const depB = await request(app)
      .post('/api/dependentes')
      .set('Authorization', `Bearer ${titular.token}`)
      .send({ nome: 'Dependente B', dataNascimento: '2012-01-01', sexo: 'masculino', aceitouResponsabilidade: true });

    const farmA = await criarFarmaceuticoAprovado(app);
    const bookA = await bookAgendada(app, titular.token, { dependentId: depA.body.id });
    await acceptAgendada(app, farmA.token, bookA.body.id);
    await iniciarConsulta(app, farmA.token, bookA.body.id, 'agendada');
    await concluirConsulta(app, farmA.token, bookA.body.id, 'agendada');

    // farmB nunca tratou nem o titular nem o dependente B — só existe para
    // criar uma segunda consulta (do dependente B) que farmA nunca deveria ver.
    const farmB = await criarFarmaceuticoAprovado(app);
    const bookB = await bookAgendada(app, titular.token, { dependentId: depB.body.id });
    await acceptAgendada(app, farmB.token, bookB.body.id);
    await iniciarConsulta(app, farmB.token, bookB.body.id, 'agendada');
    await concluirConsulta(app, farmB.token, bookB.body.id, 'agendada');

    // farmA tem vínculo com o titular (via consulta do dependente A) e por isso
    // passa no guard de getHistoricoPaciente — mas o endpoint retorna TODAS as
    // consultas do pacienteId (titular), incluindo a do dependente B, que farmA
    // nunca atendeu. Comportamento esperado: a consulta do dependente B (bookB)
    // não deveria aparecer para farmA.
    const historico = await request(app)
      .get(`/api/paciente/${titular.user.id}/historico`)
      .set('Authorization', `Bearer ${farmA.token}`);
    expect(historico.status).toBe(200);

    const idsRetornados = historico.body.map((h) => h.id);
    expect(idsRetornados).not.toContain(bookB.body.id);
  });
});
