import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { logAction } from '../utils/logAction.js';
import { criarNotificacao } from './NotificacaoController.js';
import { notifyConsultaAceita, notifyReceitaPronta, notifyEstorno, sendPushToUser } from '../services/pushService.js';
import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma    = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

const tableName = (tipo) => (tipo === 'urgente' ? 'FilaUrgente' : 'FilaAgendada');

const calcIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  try {
    const ano = new Date(dataNascimento).getFullYear();
    if (isNaN(ano)) return null;
    return new Date().getFullYear() - ano;
  } catch {
    return null;
  }
};

// ── GET /api/consulta/:id?tipo=agendada|urgente ──────────────────────────────

export const getConsulta = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo } = req.query;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  const pacienteSelect = {
    id: true, name: true, email: true, phone: true, photoUrl: true,
    pacienteProfile: { select: { dataNascimento: true, telefone: true } },
  };

  try {
    let data;
    if (tipo === 'agendada') {
      data = await prisma.filaAgendada.findUnique({
        where:   { id },
        include: { paciente: { select: pacienteSelect } },
      });
    } else {
      data = await prisma.filaUrgente.findUnique({
        where:   { id },
        include: { paciente: { select: pacienteSelect } },
      });
    }
    if (!data) return res.status(404).json({ error: 'Consulta não encontrada.' });

    // Bloqueia farmacêutico de ver consulta de outro farmacêutico
    if (data.farmaceuticoId && data.farmaceuticoId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    let observacoes = null, motivo = null, receita = [], receitaPdfUrl = null,
        encaminhamentoPdfUrl = null, motivoCancelamento = null, triagem = null, finalizacao = null;
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "observacoes", "motivo", "receita", "receita_pdf_url", "encaminhamento_pdf_url", "motivo_cancelamento", "triagem", "finalizacao" FROM "${tableName(tipo)}" WHERE id = $1`, id
      );
      if (rows.length > 0) {
        observacoes          = rows[0].observacoes              ?? null;
        motivo               = rows[0].motivo                   ?? null;
        receita              = rows[0].receita                  ?? [];
        receitaPdfUrl        = rows[0].receita_pdf_url          ?? null;
        encaminhamentoPdfUrl = rows[0].encaminhamento_pdf_url   ?? null;
        motivoCancelamento   = rows[0].motivo_cancelamento      ?? null;
        triagem              = rows[0].triagem                  ?? null;
        finalizacao          = rows[0].finalizacao              ?? null;
      }
    } catch {}

    let whatsappContato = null, modalidadeAtend = 'whatsapp', semContatoLog = null;
    let remarcacoes = 0, remarcacaoPendente = null, retornoSugerido = null, retornoDispensado = false;
    try {
      const extra = await prisma.$queryRawUnsafe(
        `SELECT "whatsapp_contato","modalidade_atend","sem_contato_log","remarcacoes","remarcacao_pendente","retorno_sugerido","retorno_dispensado" FROM "${tableName(tipo)}" WHERE id = $1`, id
      );
      if (extra.length > 0) {
        whatsappContato    = extra[0].whatsapp_contato    ?? null;
        modalidadeAtend    = extra[0].modalidade_atend    ?? 'whatsapp';
        semContatoLog      = extra[0].sem_contato_log     ?? null;
        remarcacoes        = extra[0].remarcacoes         ?? 0;
        remarcacaoPendente = extra[0].remarcacao_pendente ?? null;
        retornoSugerido    = extra[0].retorno_sugerido    ?? null;
        retornoDispensado  = extra[0].retorno_dispensado  ?? false;
      }
    } catch {}

    return res.status(200).json({
      id, tipo,
      farmaceuticoId:  data.farmaceuticoId ?? null,
      pacienteId:      data.pacienteId,
      pacienteNome:    data.paciente?.name ?? '—',
      paciente: {
        nome:     data.paciente?.name     ?? '—',
        email:    data.paciente?.email    ?? null,
        telefone: data.paciente?.pacienteProfile?.telefone ?? data.paciente?.phone ?? null,
        idade:    calcIdade(data.paciente?.pacienteProfile?.dataNascimento),
        foto:     data.paciente?.photoUrl ?? null,
      },
      dataHora:          tipo === 'urgente' ? (data.aceitoEm ?? data.criadoEm) : data.dataHora,
      status:            data.status,
      motivo,
      observacoes,
      receita,
      receitaPdfUrl,
      encaminhamentoPdfUrl,
      motivoCancelamento,
      triagem,
      finalizacao,
      creditoDebitado:   Number(data.creditoDebitado),
      whatsappContato,
      modalidadeAtend,
      semContatoLog,
      remarcacoes,
      remarcacaoPendente,
      retornoSugerido,
      retornoDispensado,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar consulta.' });
  }
};

// ── PATCH /api/consulta/:id/iniciar ─────────────────────────────────────────

export const iniciarConsulta = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    const model  = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
    const result = await model.updateMany({
      where: { id, farmaceuticoId: pharmacistId, status: 'aceito' },
      data:  { status: 'em_atendimento' },
    });
    if (result.count === 0) {
      return res.status(409).json({ error: 'Consulta não pode ser iniciada (status inválido ou não é sua).' });
    }
    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'iniciado', detalhes: { tipo } });
    return res.status(200).json({ success: true, status: 'em_atendimento' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao iniciar consulta.' });
  }
};

// ── PATCH /api/consulta/:id/concluir ────────────────────────────────────────

export const concluirConsulta = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo, observacoes, motivo, receita, finalizacao, retorno_sugerido } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });
  if (!observacoes?.trim()) return res.status(400).json({ error: 'Observações são obrigatórias para concluir.' });

  const validReceita    = Array.isArray(receita) ? receita.filter((m) => m.medicamento?.trim()) : [];
  const receitaStr      = validReceita.length > 0 ? JSON.stringify(validReceita) : null;
  const finalizacaoStr  = finalizacao ? JSON.stringify(finalizacao) : null;
  const retornoStr      = retorno_sugerido?.dias_sugeridos ? JSON.stringify(retorno_sugerido) : null;
  const table           = tableName(tipo);

  try {
    // Comissão vigente no momento da conclusão — gravada para auditoria retroativa
    let comissaoPercentual = null;
    try {
      const [comissaoRow, comissaoInd] = await Promise.all([
        prisma.systemConfig.findUnique({ where: { key: 'comissao_padrao' } }),
        prisma.$queryRawUnsafe(
          `SELECT CAST(percentual AS FLOAT) AS percentual FROM comissoes_individuais WHERE farmaceutico_id = $1`,
          pharmacistId
        ).catch(() => []),
      ]);
      comissaoPercentual = comissaoInd[0]?.percentual ?? parseFloat(comissaoRow?.value ?? '70');
    } catch { /* segue sem comissão gravada — cálculo cai no fallback "estimado" */ }

    let count;
    try {
      const sets   = [`status = 'concluido'`, `"observacoes" = $1`, `"motivo" = $2`];
      const params = [observacoes.trim(), motivo?.trim() || null];
      let pi = 3;
      if (receitaStr)     { sets.push(`"receita" = $${pi}::jsonb`);          params.push(receitaStr);     pi++; }
      if (finalizacaoStr) { sets.push(`"finalizacao" = $${pi}::jsonb`);      params.push(finalizacaoStr); pi++; }
      if (retornoStr)     { sets.push(`"retorno_sugerido" = $${pi}::jsonb`); params.push(retornoStr);     pi++; }
      if (comissaoPercentual != null) { sets.push(`"comissao_percentual" = $${pi}`); params.push(comissaoPercentual); pi++; }
      params.push(id, pharmacistId);
      count = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET ${sets.join(', ')} WHERE id = $${pi} AND "farmaceuticoId" = $${pi + 1} AND status = 'em_atendimento'`,
        ...params
      );
    } catch {
      const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
      const r = await model.updateMany({
        where: { id, farmaceuticoId: pharmacistId, status: 'em_atendimento' },
        data:  { status: 'concluido' },
      });
      count = r.count;
    }
    if (count === 0) return res.status(409).json({ error: 'Consulta não pode ser concluída (verifique o status).' });
    let duracaoMin = null;
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT criado_em FROM log_acoes WHERE consulta_id = $1 AND acao = 'iniciado' ORDER BY criado_em DESC LIMIT 1`,
        id
      );
      if (rows.length > 0) {
        duracaoMin = Math.round((Date.now() - new Date(rows[0].criado_em).getTime()) / 60000);
      }
    } catch {}
    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'concluido', detalhes: { tipo, duracao_min: duracaoMin } });

    // Notificação de documento + retorno sugerido
    try {
      const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
      const fila  = await model.findUnique({ where: { id }, select: { pacienteId: true } });
      if (fila) {
        await criarNotificacao({
          userId:     fila.pacienteId,
          tipo:       'documento',
          titulo:     'Orientações disponíveis',
          mensagem:   'O farmacêutico registrou as orientações da sua consulta.',
          consultaId: id,
        });
        await notifyReceitaPronta(fila.pacienteId);
        if (retornoStr) {
          const diasSugeridos = retorno_sugerido.dias_sugeridos;
          const obs           = retorno_sugerido.observacao?.trim() || '';
          const dataApprox    = new Date(Date.now() + diasSugeridos * 86400000);
          const dataFmt       = dataApprox.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          await criarNotificacao({
            userId:     fila.pacienteId,
            tipo:       'retorno_sugerido',
            titulo:     `Retorno sugerido para ~${dataFmt}`,
            mensagem:   obs || `Seu farmacêutico sugere um retorno em ${diasSugeridos} dias.`,
            consultaId: id,
          });
        }
      }
    } catch {}

    return res.status(200).json({ success: true, status: 'concluido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao concluir consulta.' });
  }
};

// ── PATCH /api/consulta/:id/cancelar ────────────────────────────────────────

export const cancelarConsulta = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo, motivo_cancelamento } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });
  if (!motivo_cancelamento?.trim()) return res.status(400).json({ error: 'Motivo do cancelamento é obrigatório.' });

  try {
    const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
    const fila  = await model.findFirst({ where: { id, farmaceuticoId: pharmacistId } });
    if (!fila) return res.status(404).json({ error: 'Consulta não encontrada.' });
    if (['concluido', 'cancelado', 'expirado'].includes(fila.status)) {
      return res.status(400).json({ error: 'Consulta já finalizada.' });
    }

    await prisma.$transaction(async (tx) => {
      const txModel = tipo === 'urgente' ? tx.filaUrgente : tx.filaAgendada;
      await txModel.update({ where: { id }, data: { status: 'cancelado' } });
      if (Number(fila.creditoDebitado) > 0) {
        await tx.carteira.update({
          where: { pacienteId: fila.pacienteId },
          data:  { saldo: { increment: fila.creditoDebitado } },
        });
      }
    });

    // Salvar motivo_cancelamento via raw SQL (coluna pode não estar no schema Prisma)
    const table = tableName(tipo);
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET motivo_cancelamento = $1 WHERE id = $2`,
        motivo_cancelamento.trim(), id
      );
    } catch {}

    const creditoDevolvido = Number(fila.creditoDebitado);
    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'cancelado', detalhes: { tipo, motivo: motivo_cancelamento.trim(), cancelado_por: 'farmaceutico' } });
    if (creditoDevolvido > 0) {
      await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'reembolso', detalhes: { tipo, valor: creditoDevolvido } });
    }
    return res.status(200).json({ success: true, creditoDevolvido });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cancelar consulta.' });
  }
};

// ── PATCH /api/consulta/:id/salvar-rascunho ─────────────────────────────────

export const salvarRascunho = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo, motivo, observacoes, receita } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  const table      = tableName(tipo);
  const receitaStr = Array.isArray(receita) && receita.filter((m) => m.medicamento?.trim()).length > 0
    ? JSON.stringify(receita.filter((m) => m.medicamento?.trim()))
    : null;

  try {
    let count;
    try {
      if (receitaStr) {
        count = await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "observacoes" = $1, "motivo" = $2, "receita" = $3::jsonb
           WHERE id = $4 AND "farmaceuticoId" = $5 AND status IN ('aceito', 'em_atendimento')`,
          observacoes?.trim() || null, motivo?.trim() || null, receitaStr, id, pharmacistId
        );
      } else {
        count = await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "observacoes" = $1, "motivo" = $2
           WHERE id = $3 AND "farmaceuticoId" = $4 AND status IN ('aceito', 'em_atendimento')`,
          observacoes?.trim() || null, motivo?.trim() || null, id, pharmacistId
        );
      }
    } catch {
      const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
      const r = await model.updateMany({
        where: { id, farmaceuticoId: pharmacistId, status: { in: ['aceito', 'em_atendimento'] } },
        data:  {},
      });
      count = r.count;
    }
    if (count === 0) return res.status(409).json({ error: 'Rascunho não pode ser salvo (status inválido).' });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao salvar rascunho.' });
  }
};

// ── POST /api/consulta/:id/receita/pdf ──────────────────────────────────────

export const gerarReceitaPdf = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    const table = tableName(tipo);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT c.status, c."observacoes", c."receita",
              ${tipo === 'agendada' ? 'c."dataHora" as data_hora' : 'COALESCE(c."aceitoEm", c."criadoEm") as data_hora'},
              u.name as "pacienteNome"
       FROM "${table}" c
       JOIN "User" u ON u.id = c."pacienteId"
       WHERE c.id = $1 AND c."farmaceuticoId" = $2`,
      id, pharmacistId
    );
    if (!rows.length) return res.status(404).json({ error: 'Consulta não encontrada.' });
    const row = rows[0];
    if (row.status !== 'concluido') {
      return res.status(400).json({ error: 'Conclua a consulta antes de gerar a receita.' });
    }

    const [pharmProfile, pharmUser] = await Promise.all([
      prisma.pharmacistProfile.findUnique({
        where:  { userId: pharmacistId },
        select: { crfNumber: true, crfUF: true },
      }),
      prisma.user.findUnique({ where: { id: pharmacistId }, select: { name: true } }),
    ]);

    const itens = Array.isArray(row.receita) ? row.receita : [];

    const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../../uploads');
    const receitasDir = join(UPLOAD_DIR, 'receitas');
    mkdirSync(receitasDir, { recursive: true });

    const filename = `receita-${id}.pdf`;
    const filepath = join(receitasDir, filename);
    const pdfUrl   = `/uploads/receitas/${filename}`;

    await buildPdf({
      filepath,
      pacienteNome: row.pacienteNome,
      dataHora:     row.data_hora,
      farmNome:     pharmUser?.name ?? '—',
      farmCrf:      pharmProfile ? `${pharmProfile.crfUF}-${pharmProfile.crfNumber}` : '—',
      itens,
      observacoes:  row.observacoes ?? '',
    });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "receita_pdf_url" = $1 WHERE id = $2`, pdfUrl, id
      );
    } catch {}

    return res.status(200).json({ url: pdfUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao gerar PDF.' });
  }
};

// ── PATCH /api/consulta/:id/devolver ────────────────────────────────────────

export const devolverConsulta = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo, motivo } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
    const table = tableName(tipo);

    const fila = await model.findFirst({ where: { id, farmaceuticoId: pharmacistId } });
    if (!fila) return res.status(404).json({ error: 'Consulta não encontrada ou não é sua.' });
    if (!['aceito', 'em_atendimento'].includes(fila.status)) {
      return res.status(400).json({ error: 'Só é possível devolver consultas aceitas ou em atendimento.' });
    }

    const pharmUser = await prisma.user.findUnique({ where: { id: pharmacistId }, select: { name: true } });
    const logEntry  = JSON.stringify([{
      farmaceuticoId:   pharmacistId,
      farmaceuticoNome: pharmUser?.name ?? '—',
      quando:           new Date().toISOString(),
      motivo:           motivo?.trim() || null,
    }]);

    let count;
    try {
      count = await prisma.$executeRawUnsafe(
        `UPDATE "${table}"
         SET status = 'aguardando',
             "farmaceuticoId" = NULL,
             "devolucoes" = COALESCE("devolucoes", '[]'::jsonb) || $1::jsonb
         WHERE id = $2 AND status IN ('aceito', 'em_atendimento')`,
        logEntry, id
      );
    } catch {
      const r = await model.updateMany({
        where: { id, status: { in: ['aceito', 'em_atendimento'] } },
        data:  { status: 'aguardando', farmaceuticoId: null },
      });
      count = r.count;
    }

    if (count === 0) return res.status(409).json({ error: 'Consulta não pode ser devolvida.' });
    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'devolvido', detalhes: { tipo, motivo: motivo?.trim() || null } });
    return res.status(200).json({ success: true, status: 'aguardando' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao devolver consulta.' });
  }
};

// ── PATCH /api/consulta/:id/sem-contato ─────────────────────────────────────
// Farmacêutico registra tentativa sem sucesso → cancela com estorno integral

export const semContato = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
    const table = tableName(tipo);

    const fila = await model.findFirst({ where: { id, farmaceuticoId: pharmacistId } });
    if (!fila) return res.status(404).json({ error: 'Consulta não encontrada ou não é sua.' });
    if (!['aceito', 'em_atendimento'].includes(fila.status)) {
      return res.status(400).json({ error: 'Só é possível registrar sem-contato em consultas aceitas ou em atendimento.' });
    }

    const tentativa = JSON.stringify([{ quando: new Date().toISOString(), farmaceuticoId: pharmacistId }]);
    const credito   = Number(fila.creditoDebitado);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE "${table}"
         SET status = 'cancelado',
             "farmaceuticoId" = NULL,
             "motivo_cancelamento" = 'Sem contato com o paciente',
             "sem_contato_log" = COALESCE("sem_contato_log", '[]'::jsonb) || $1::jsonb
         WHERE id = $2`,
        tentativa, id
      );
      if (credito > 0) {
        const carteira = await tx.carteira.update({
          where: { pacienteId: fila.pacienteId },
          data:  { saldo: { increment: credito } },
        });
        await tx.transacaoCarteira.create({
          data: {
            carteiraId: carteira.id,
            tipo:       'credito',
            valor:      credito,
            saldoApos:  carteira.saldo,
            descricao:  'Estorno — farmacêutico não conseguiu contato',
            consultaId: id,
          },
        });
      }
    });

    await criarNotificacao({
      userId:   fila.pacienteId,
      tipo:     'estorno',
      titulo:   'Farmacêutico tentou contato',
      mensagem: `O farmacêutico não conseguiu falar com você. O valor foi devolvido ao seu saldo.`,
      consultaId: id,
    });
    await notifyEstorno(fila.pacienteId);

    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'sem_contato', detalhes: { tipo } });
    return res.json({ success: true, status: 'cancelado', estorno: credito });
  } catch (err) {
    console.error('semContato:', err);
    return res.status(500).json({ error: 'Erro ao registrar sem-contato.' });
  }
};

// ── PATCH /api/consulta/:id/remarcar ────────────────────────────────────────
// Paciente remarca consulta agendada (máx 2x, com 2h de antecedência)

export const remarcarConsulta = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { nova_data_hora } = req.body;
  const pacienteId = req.user.id;

  if (!nova_data_hora) return res.status(400).json({ error: 'nova_data_hora é obrigatória.' });

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT status, "dataHora", remarcacoes, "pacienteId", "farmaceuticoId" FROM "FilaAgendada" WHERE id = $1`, id
    );
    if (!rows.length || rows[0].pacienteId !== pacienteId) {
      return res.status(404).json({ error: 'Consulta não encontrada.' });
    }
    const fila = rows[0];
    if (!['aguardando', 'aceito'].includes(fila.status)) {
      return res.status(400).json({ error: 'Só é possível remarcar consultas aguardando ou aceitas.' });
    }
    const remarcacoes = Number(fila.remarcacoes ?? 0);
    if (remarcacoes >= 2) {
      return res.status(400).json({ error: 'Limite de 2 remarcações atingido. Para mudar o horário, cancele e reagende.' });
    }
    const diffHoras = (new Date(fila.dataHora).getTime() - Date.now()) / 3600000;
    if (diffHoras < 2) {
      return res.status(400).json({ error: 'Remarcação só é permitida até 2 horas antes da consulta.' });
    }
    const novaData = new Date(nova_data_hora);
    if (isNaN(novaData.getTime()) || novaData <= new Date()) {
      return res.status(400).json({ error: 'nova_data_hora inválida.' });
    }

    const novaDataBR = new Date(novaData.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horario = await prisma.sistemaHorario.findUnique({ where: { diaSemana: novaDataBR.getDay() } });
    const horaStr = `${String(novaDataBR.getHours()).padStart(2, '0')}:${String(novaDataBR.getMinutes()).padStart(2, '0')}`;
    if (!horario || !horario.ativo || horaStr < horario.horaInicio || horaStr >= horario.horaFim) {
      return res.status(400).json({
        error: horario?.ativo
          ? `Horário fora do funcionamento do sistema (das ${horario.horaInicio} às ${horario.horaFim}).`
          : 'O sistema não funciona neste dia.',
      });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "FilaAgendada"
       SET "dataHora" = $1, remarcacoes = remarcacoes + 1
       WHERE id = $2 AND "pacienteId" = $3`,
      novaData, id, pacienteId
    );

    await logAction(prisma, { consultaId: id, usuarioId: pacienteId, role: req.user.role, acao: 'remarcado', detalhes: { nova_data_hora, remarcacoes: remarcacoes + 1 } });

    if (fila.farmaceuticoId) {
      await criarNotificacao({
        userId:     fila.farmaceuticoId,
        tipo:       'consulta_remarcada_paciente',
        titulo:     'Paciente remarcou a consulta',
        mensagem:   `O paciente remarcou a consulta para ${novaData.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`,
        consultaId: id,
      });
      await sendPushToUser(fila.farmaceuticoId, {
        title: '🔄 Consulta remarcada',
        body:  'O paciente remarcou uma consulta que você aceitou.',
        url:   '/dashboard',
      });
    }

    return res.json({ success: true, nova_data_hora: novaData, remarcacoes: remarcacoes + 1 });
  } catch (err) {
    console.error('remarcarConsulta:', err);
    return res.status(500).json({ error: 'Erro ao remarcar consulta.' });
  }
};

// ── PATCH /api/consulta/:id/propor-remarcacao ────────────────────────────────
// Farmacêutico propõe novo horário ao paciente

export const proporRemarcacao = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { nova_data_hora, motivo } = req.body;
  const pharmacistId = req.user.id;

  if (!nova_data_hora) return res.status(400).json({ error: 'nova_data_hora é obrigatória.' });
  if (!motivo?.trim()) return res.status(400).json({ error: 'Motivo é obrigatório.' });

  try {
    const fila = await prisma.filaAgendada.findFirst({
      where: { id, farmaceuticoId: pharmacistId, status: 'aceito' },
    });
    if (!fila) return res.status(404).json({ error: 'Consulta não encontrada ou não é sua.' });

    const novaData  = new Date(nova_data_hora);
    if (isNaN(novaData.getTime())) return res.status(400).json({ error: 'Data inválida.' });
    const expiraEm  = new Date(Date.now() + 24 * 3600 * 1000);
    const pendente  = JSON.stringify({ novaDataHora: novaData, motivo: motivo.trim(), propostoEm: new Date(), expiraEm });

    await prisma.$executeRawUnsafe(
      `UPDATE "FilaAgendada"
       SET status = 'remarcacao_pendente', "remarcacao_pendente" = $1::jsonb
       WHERE id = $2`,
      pendente, id
    );

    await criarNotificacao({
      userId:     fila.pacienteId,
      tipo:       'remarcacao',
      titulo:     'Farmacêutico propôs novo horário',
      mensagem:   `Motivo: ${motivo.trim()}. Novo horário: ${novaData.toLocaleString('pt-BR')}. Você tem 24h para responder.`,
      consultaId: id,
    });

    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'proposta_remarcacao', detalhes: { nova_data_hora, motivo: motivo.trim() } });
    return res.json({ success: true, status: 'remarcacao_pendente', expiraEm });
  } catch (err) {
    console.error('proporRemarcacao:', err);
    return res.status(500).json({ error: 'Erro ao propor remarcação.' });
  }
};

// ── PATCH /api/consulta/:id/responder-remarcacao ─────────────────────────────
// Paciente responde à proposta do farmacêutico

export const responderRemarcacao = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { decisao, nova_data_hora } = req.body;
  const pacienteId = req.user.id;

  if (!['aceitar', 'outro', 'cancelar'].includes(decisao)) {
    return res.status(400).json({ error: 'decisao deve ser aceitar, outro ou cancelar.' });
  }

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT status, "creditoDebitado", "remarcacao_pendente", "pacienteId", "farmaceuticoId" FROM "FilaAgendada" WHERE id = $1`, id
    );
    if (!rows.length || rows[0].pacienteId !== pacienteId) {
      return res.status(404).json({ error: 'Consulta não encontrada.' });
    }
    const fila = rows[0];
    if (fila.status !== 'remarcacao_pendente') {
      return res.status(400).json({ error: 'Consulta não está aguardando resposta de remarcação.' });
    }
    const pendente = fila.remarcacao_pendente;

    if (decisao === 'cancelar') {
      // Estorno integral — cancelamento partiu do farmacêutico
      const credito = Number(fila.creditoDebitado);
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE "FilaAgendada" SET status = 'cancelado', "remarcacao_pendente" = NULL, "motivo_cancelamento" = 'Paciente recusou remarcação proposta pelo farmacêutico' WHERE id = $1`, id
        );
        if (credito > 0) {
          const carteira = await tx.carteira.update({ where: { pacienteId }, data: { saldo: { increment: credito } } });
          await tx.transacaoCarteira.create({ data: { carteiraId: carteira.id, tipo: 'credito', valor: credito, saldoApos: carteira.saldo, descricao: 'Estorno — paciente recusou remarcação do farmacêutico', consultaId: id } });
        }
      });
      await logAction(prisma, { consultaId: id, usuarioId: pacienteId, role: req.user.role, acao: 'remarcacao_recusada', detalhes: { estorno: credito } });
      if (fila.farmaceuticoId) {
        await criarNotificacao({
          userId:     fila.farmaceuticoId,
          tipo:       'remarcacao_recusada',
          titulo:     'Paciente recusou a remarcação',
          mensagem:   'O paciente recusou o novo horário proposto. A consulta foi cancelada e o valor estornado.',
          consultaId: id,
        });
      }
      return res.json({ success: true, status: 'cancelado' });
    }

    // aceitar → usa novaDataHora da proposta | outro → usa nova_data_hora do body
    const novaData = decisao === 'aceitar'
      ? new Date(pendente?.novaDataHora)
      : new Date(nova_data_hora);

    if (isNaN(novaData?.getTime())) {
      return res.status(400).json({ error: 'Data inválida.' });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "FilaAgendada"
       SET status = 'aceito', "dataHora" = $1, "remarcacao_pendente" = NULL, remarcacoes = remarcacoes + 1
       WHERE id = $2`,
      novaData, id
    );
    await logAction(prisma, { consultaId: id, usuarioId: pacienteId, role: req.user.role, acao: 'remarcacao_aceita', detalhes: { decisao, nova_data_hora: novaData } });
    if (fila.farmaceuticoId) {
      await criarNotificacao({
        userId:     fila.farmaceuticoId,
        tipo:       'remarcacao_respondida',
        titulo:     decisao === 'aceitar' ? 'Paciente aceitou o novo horário' : 'Paciente propôs outro horário',
        mensagem:   `Novo horário confirmado: ${novaData.toLocaleString('pt-BR')}.`,
        consultaId: id,
      });
    }
    return res.json({ success: true, status: 'aceito', nova_data_hora: novaData });
  } catch (err) {
    console.error('responderRemarcacao:', err);
    return res.status(500).json({ error: 'Erro ao responder remarcação.' });
  }
};

// ── PATCH /api/consulta/:id/dispensar-retorno ────────────────────────────────

export const dispensarRetorno = async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.body;
  const userId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    const table = tableName(tipo);
    const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;

    // Valida que é o próprio paciente
    const fila = await model.findFirst({ where: { id, pacienteId: userId } });
    if (!fila) return res.status(404).json({ error: 'Consulta não encontrada.' });

    await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "retorno_dispensado" = true WHERE id = $1`, id
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('dispensarRetorno:', err);
    return res.status(500).json({ error: 'Erro ao dispensar retorno.' });
  }
};

// ── GET /api/paciente/:id/historico (farmacêutico vê histórico do paciente) ──

export const getHistoricoPaciente = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id: patientId } = req.params;
  const pharmacistId = req.user.id;

  try {
    // Só farmacêuticos que já tiveram vínculo de atendimento com este paciente podem ver o histórico
    const vinculo = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM "FilaAgendada" WHERE "pacienteId" = $1 AND "farmaceuticoId" = $2
       UNION SELECT 1 FROM "FilaUrgente" WHERE "pacienteId" = $1 AND "farmaceuticoId" = $2
       LIMIT 1`,
      patientId, pharmacistId
    );
    if (vinculo.length === 0) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    let agendadas = [], urgentes = [];

    try {
      agendadas = await prisma.$queryRawUnsafe(
        `SELECT id, "dataHora", status, "observacoes", "motivo", "criadoEm" FROM "FilaAgendada" WHERE "pacienteId" = $1 AND status IN ('concluido', 'cancelado') ORDER BY "criadoEm" DESC LIMIT 20`,
        patientId
      );
    } catch {
      agendadas = await prisma.filaAgendada.findMany({
        where:   { pacienteId: patientId, status: { in: ['concluido', 'cancelado'] } },
        select:  { id: true, dataHora: true, status: true, criadoEm: true },
        orderBy: { criadoEm: 'desc' }, take: 20,
      });
    }

    try {
      urgentes = await prisma.$queryRawUnsafe(
        `SELECT id, "criadoEm", status, "observacoes", "motivo" FROM "FilaUrgente" WHERE "pacienteId" = $1 AND status IN ('concluido', 'cancelado') ORDER BY "criadoEm" DESC LIMIT 20`,
        patientId
      );
    } catch {
      urgentes = await prisma.filaUrgente.findMany({
        where:   { pacienteId: patientId, status: { in: ['concluido', 'cancelado'] } },
        select:  { id: true, criadoEm: true, status: true },
        orderBy: { criadoEm: 'desc' }, take: 20,
      });
    }

    const normalized = [
      ...agendadas.map((f) => ({
        id: f.id, tipo: 'agendada',
        data: f.dataHora, status: f.status,
        observacoes: f.observacoes ?? null, motivo: f.motivo ?? null,
        criadoEm: f.criadoEm,
      })),
      ...urgentes.map((f) => ({
        id: f.id, tipo: 'urgente',
        data: f.criadoEm, status: f.status,
        observacoes: f.observacoes ?? null, motivo: f.motivo ?? null,
        criadoEm: f.criadoEm,
      })),
    ].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, 20);

    return res.status(200).json(normalized);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
};

// ── GET /api/consulta/:id/detalhes ──────────────────────────────────────────

export const getDetalhesConsulta = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo } = req.query;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  const pacienteSelect = {
    id: true, name: true, email: true, phone: true, photoUrl: true,
    pacienteProfile: { select: { dataNascimento: true, telefone: true } },
  };

  try {
    const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
    const data  = await model.findUnique({
      where:   { id },
      include: { paciente: { select: pacienteSelect } },
    });
    if (!data) return res.status(404).json({ error: 'Consulta não encontrada.' });

    // Bloqueia farmacêutico de ver detalhes de consulta de outro farmacêutico
    if (data.farmaceuticoId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    let farmaceuticoNome = null;
    if (data.farmaceuticoId) {
      try {
        const farm = await prisma.user.findUnique({ where: { id: data.farmaceuticoId }, select: { name: true } });
        farmaceuticoNome = farm?.name ?? null;
      } catch {}
    }

    let observacoes = null, motivo = null, receita = [], receitaPdfUrl = null,
        encaminhamentoPdfUrl = null, motivoCancelamento = null, triagem = null, finalizacao = null;
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "observacoes", "motivo", "receita", "receita_pdf_url", "encaminhamento_pdf_url", "motivo_cancelamento", "triagem", "finalizacao" FROM "${tableName(tipo)}" WHERE id = $1`, id
      );
      if (rows.length > 0) {
        observacoes          = rows[0].observacoes              ?? null;
        motivo               = rows[0].motivo                   ?? null;
        receita              = rows[0].receita                  ?? [];
        receitaPdfUrl        = rows[0].receita_pdf_url          ?? null;
        encaminhamentoPdfUrl = rows[0].encaminhamento_pdf_url   ?? null;
        motivoCancelamento   = rows[0].motivo_cancelamento      ?? null;
        triagem              = rows[0].triagem                  ?? null;
        finalizacao          = rows[0].finalizacao              ?? null;
      }
    } catch {}

    return res.status(200).json({
      id, tipo,
      farmaceuticoId:   data.farmaceuticoId  ?? null,
      farmaceuticoNome,
      pacienteId:       data.pacienteId,
      pacienteNome:     data.paciente?.name   ?? '—',
      paciente: {
        nome:     data.paciente?.name     ?? '—',
        email:    data.paciente?.email    ?? null,
        telefone: data.paciente?.pacienteProfile?.telefone ?? data.paciente?.phone ?? null,
        idade:    calcIdade(data.paciente?.pacienteProfile?.dataNascimento),
        foto:     data.paciente?.photoUrl ?? null,
      },
      dataHora:        tipo === 'urgente' ? (data.aceitoEm ?? data.criadoEm) : data.dataHora,
      status:          data.status,
      motivo,
      observacoes,
      receita,
      receitaPdfUrl,
      encaminhamentoPdfUrl,
      motivoCancelamento,
      triagem,
      finalizacao,
      creditoDebitado: Number(data.creditoDebitado),
    });
  } catch (err) {
    console.error('getDetalhesConsulta error:', err);
    return res.status(500).json({ error: 'Erro ao buscar detalhes.' });
  }
};

// ── GET /api/consulta/:id/historico-completo ────────────────────────────────

export const getHistoricoCompleto = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo } = req.query;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    const model = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;
    const consulta = await model.findUnique({
      where:  { id },
      select: { pacienteId: true, farmaceuticoId: true, status: true, dependentId: true },
    });
    if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada.' });

    // Acesso permitido apenas ao farmacêutico responsável com consulta ATIVA
    if (consulta.farmaceuticoId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    if (!['aceito', 'em_atendimento'].includes(consulta.status)) {
      return res.status(403).json({ error: 'O histórico do paciente só é acessível durante consultas ativas.' });
    }

    // Audit log
    await logAction(prisma, {
      consultaId: id,
      usuarioId:  req.user.id,
      role:       'FARMACEUTICO',
      acao:       'acesso_historico',
      detalhes:   { pacienteId: consulta.pacienteId, dependentId: consulta.dependentId ?? null },
    });

    const patientId  = consulta.pacienteId;
    const dependentId = consulta.dependentId ?? null;

    // Filtro por dependente: históricos separados por pessoa atendida
    const depFilterAg = dependentId
      ? `AND fa."dependentId" = '${dependentId}'`
      : `AND fa."dependentId" IS NULL`;
    const depFilterUr = dependentId
      ? `AND fu."dependentId" = '${dependentId}'`
      : `AND fu."dependentId" IS NULL`;

    let agendadas = [], urgentes = [];

    try {
      agendadas = await prisma.$queryRawUnsafe(
        `SELECT fa.id,
                fa."dataHora"  AS data_hora,
                'agendada'     AS tipo,
                fa.status,
                fa."observacoes",
                fa."motivo",
                fa."triagem",
                fa."receita",
                fa."receita_pdf_url",
                fa."finalizacao",
                u.name         AS farmaceutico_nome
         FROM "FilaAgendada" fa
         LEFT JOIN "User" u ON u.id = fa."farmaceuticoId"
         WHERE fa."pacienteId" = $1
           AND fa.id != $2
           AND fa.status IN ('concluido', 'cancelado')
           ${depFilterAg}
         ORDER BY fa."criadoEm" DESC
         LIMIT 10`,
        patientId, id
      );
    } catch {
      const rows = await prisma.filaAgendada.findMany({
        where:   { pacienteId: patientId, status: { in: ['concluido', 'cancelado'] }, NOT: { id } },
        select:  { id: true, dataHora: true, status: true, criadoEm: true },
        orderBy: { criadoEm: 'desc' }, take: 10,
      });
      agendadas = rows.map((r) => ({ id: r.id, data_hora: r.dataHora, tipo: 'agendada', status: r.status, observacoes: null, motivo: null, triagem: null, receita: null, receita_pdf_url: null, farmaceutico_nome: null }));
    }

    try {
      urgentes = await prisma.$queryRawUnsafe(
        `SELECT fu.id,
                fu."criadoEm"  AS data_hora,
                'urgente'      AS tipo,
                fu.status,
                fu."observacoes",
                fu."motivo",
                fu."triagem",
                fu."receita",
                fu."receita_pdf_url",
                fu."finalizacao",
                u.name         AS farmaceutico_nome
         FROM "FilaUrgente" fu
         LEFT JOIN "User" u ON u.id = fu."farmaceuticoId"
         WHERE fu."pacienteId" = $1
           AND fu.id != $2
           AND fu.status IN ('concluido', 'cancelado')
           ${depFilterUr}
         ORDER BY fu."criadoEm" DESC
         LIMIT 10`,
        patientId, id
      );
    } catch {
      const rows = await prisma.filaUrgente.findMany({
        where:   { pacienteId: patientId, status: { in: ['concluido', 'cancelado'] }, NOT: { id } },
        select:  { id: true, criadoEm: true, status: true },
        orderBy: { criadoEm: 'desc' }, take: 10,
      });
      urgentes = rows.map((r) => ({ id: r.id, data_hora: r.criadoEm, tipo: 'urgente', status: r.status, observacoes: null, motivo: null, triagem: null, receita: null, receita_pdf_url: null, farmaceutico_nome: null }));
    }

    const normalized = [...agendadas, ...urgentes]
      .sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora))
      .slice(0, 10)
      .map((r) => ({
        id:               r.id,
        dataHora:         r.data_hora,
        tipo:             r.tipo,
        status:           r.status,
        farmaceuticoNome: r.farmaceutico_nome ?? null,
        motivo:           r.motivo            ?? null,
        observacoes:      r.observacoes        ?? null,
        triagem:          r.triagem            ?? null,
        receita:          Array.isArray(r.receita) ? r.receita : [],
        receitaPdfUrl:    r.receita_pdf_url    ?? null,
        finalizacao:      r.finalizacao        ?? null,
      }));

    return res.status(200).json(normalized);
  } catch (err) {
    console.error('getHistoricoCompleto error:', err);
    return res.status(500).json({ error: 'Erro ao buscar histórico completo.' });
  }
};

// ── PDF helper ───────────────────────────────────────────────────────────────

async function buildPdf({ filepath, pacienteNome, dataHora, farmNome, farmCrf, itens, observacoes }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const out = createWriteStream(filepath);
    doc.pipe(out);

    const W        = doc.page.width - 100; // 495pt usable width
    const dateStr  = new Date(dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const VIOLET   = '#7c3aed';
    const DARK     = '#111827';
    const GRAY     = '#6b7280';
    const DIVIDER  = '#e5e7eb';

    // ── Header ────────────────────────────────────────────────────────────────
    doc.rect(50, 45, W, 65).fill(VIOLET);
    doc.fillColor('white')
       .font('Helvetica-Bold').fontSize(20).text('FarmaConsulta', 50, 57, { align: 'center', width: W })
       .font('Helvetica').fontSize(11).text('Receita Farmacêutica', 50, 83, { align: 'center', width: W });

    // ── Info block ────────────────────────────────────────────────────────────
    const iY = 128;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10)
       .text('Farmacêutico(a):', 50, iY);
    doc.font('Helvetica')
       .text(farmNome, 170, iY)
       .text(`CRF: ${farmCrf}`, 50, iY + 16)
       .text(`Data: ${dateStr}`, 50, iY, { align: 'right', width: W });

    doc.font('Helvetica-Bold').text('Paciente:', 50, iY + 34);
    doc.font('Helvetica').text(pacienteNome, 115, iY + 34);

    // ── Divider ───────────────────────────────────────────────────────────────
    let y = iY + 56;
    const hr = (atY) => doc.moveTo(50, atY).lineTo(50 + W, atY).strokeColor(DIVIDER).lineWidth(1).stroke();
    hr(y);
    y += 14;

    // ── Medications ───────────────────────────────────────────────────────────
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('PRESCRIÇÃO:', 50, y);
    y += 18;

    if (itens.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor(GRAY).text('Nenhum medicamento prescrito.', 50, y);
      y += 16;
    } else {
      itens.forEach((med, i) => {
        const label = `${i + 1}. ${(med.medicamento || '').trim()}${med.dosagem ? `  ${med.dosagem}` : ''}`;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(label, 50, y);
        y += 15;
        if (med.posologia) {
          doc.font('Helvetica').text(`   Posologia: ${med.posologia}`, 50, y);
          y += 14;
        }
        if (med.duracao) {
          doc.font('Helvetica').text(`   Duração: ${med.duracao}`, 50, y);
          y += 14;
        }
        y += 5;
      });
    }

    // ── Observations ──────────────────────────────────────────────────────────
    if (observacoes.trim()) {
      y += 4;
      hr(y);
      y += 14;
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('OBSERVAÇÕES:', 50, y);
      y += 18;
      const obsText = observacoes.trim();
      doc.font('Helvetica').fontSize(10).text(obsText, 50, y, { width: W });
      y += doc.heightOfString(obsText, { width: W }) + 4;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footY = doc.page.height - 52;
    hr(footY - 10);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRAY)
       .text('Orientação farmacêutica — não substitui prescrição médica', 50, footY, { align: 'center', width: W });

    doc.end();
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

// ── Encaminhamento PDF ────────────────────────────────────────────────────────

export const gerarEncaminhamentoPdf = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo, especialidade, resumoClinico } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });
  if (!especialidade?.trim()) return res.status(400).json({ error: 'Especialidade/serviço de destino é obrigatório.' });

  try {
    const table = tableName(tipo);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT c.status, c."observacoes", c."encaminhamento_detalhe",
              ${tipo === 'agendada' ? 'c."dataHora" as data_hora' : 'COALESCE(c."aceitoEm", c."criadoEm") as data_hora'},
              u.name as "pacienteNome"
       FROM "${table}" c
       JOIN "User" u ON u.id = c."pacienteId"
       WHERE c.id = $1 AND c."farmaceuticoId" = $2`,
      id, pharmacistId
    );
    if (!rows.length) return res.status(404).json({ error: 'Consulta não encontrada.' });
    const row = rows[0];
    if (row.status !== 'concluido') {
      return res.status(400).json({ error: 'Conclua a consulta antes de gerar o encaminhamento.' });
    }

    const [pharmProfile, pharmUser] = await Promise.all([
      prisma.pharmacistProfile.findUnique({
        where:  { userId: pharmacistId },
        select: { crfNumber: true, crfUF: true },
      }),
      prisma.user.findUnique({ where: { id: pharmacistId }, select: { name: true } }),
    ]);

    const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../../uploads');
    const receitasDir = join(UPLOAD_DIR, 'receitas');
    mkdirSync(receitasDir, { recursive: true });

    const filename = `encaminhamento-${id}.pdf`;
    const filepath = join(receitasDir, filename);
    const pdfUrl   = `/uploads/receitas/${filename}`;

    await buildEncaminhamentoPdf({
      filepath,
      pacienteNome:  row.pacienteNome,
      dataHora:      row.data_hora,
      farmNome:      pharmUser?.name ?? '—',
      farmCrf:       pharmProfile ? `${pharmProfile.crfUF}-${pharmProfile.crfNumber}` : '—',
      especialidade: especialidade.trim(),
      resumoClinico: resumoClinico?.trim() ?? row.encaminhamento_detalhe ?? '',
      observacoes:   row.observacoes ?? '',
    });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "encaminhamento_pdf_url" = $1 WHERE id = $2`, pdfUrl, id
      );
    } catch {}

    return res.status(200).json({ url: pdfUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao gerar PDF de encaminhamento.' });
  }
};

async function buildEncaminhamentoPdf({ filepath, pacienteNome, dataHora, farmNome, farmCrf, especialidade, resumoClinico, observacoes }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const out = createWriteStream(filepath);
    doc.pipe(out);

    const W       = doc.page.width - 100;
    const dateStr = new Date(dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const VIOLET  = '#7c3aed';
    const DARK    = '#111827';
    const GRAY    = '#6b7280';
    const DIVIDER = '#e5e7eb';

    // ── Header ────────────────────────────────────────────────────────────────
    doc.rect(50, 45, W, 65).fill(VIOLET);
    doc.fillColor('white')
       .font('Helvetica-Bold').fontSize(20).text('FarmaConsulta', 50, 57, { align: 'center', width: W })
       .font('Helvetica').fontSize(11).text('Documento de Encaminhamento', 50, 83, { align: 'center', width: W });

    // ── Info block ────────────────────────────────────────────────────────────
    const iY = 128;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Farmacêutico(a):', 50, iY);
    doc.font('Helvetica')
       .text(farmNome, 170, iY)
       .text(`CRF: ${farmCrf}`, 50, iY + 16)
       .text(`Data: ${dateStr}`, 50, iY, { align: 'right', width: W });

    doc.font('Helvetica-Bold').text('Paciente:', 50, iY + 34);
    doc.font('Helvetica').text(pacienteNome, 115, iY + 34);

    // ── Divider ───────────────────────────────────────────────────────────────
    let y = iY + 56;
    const hr = (atY) => doc.moveTo(50, atY).lineTo(50 + W, atY).strokeColor(DIVIDER).lineWidth(1).stroke();
    hr(y);
    y += 14;

    // ── Especialidade ─────────────────────────────────────────────────────────
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('ESPECIALIDADE / SERVIÇO DE DESTINO:', 50, y);
    y += 18;
    doc.font('Helvetica').fontSize(10).text(especialidade, 50, y, { width: W });
    y += doc.heightOfString(especialidade, { width: W }) + 10;

    // ── Resumo clínico ────────────────────────────────────────────────────────
    if (resumoClinico?.trim()) {
      hr(y);
      y += 14;
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('RESUMO CLÍNICO:', 50, y);
      y += 18;
      doc.font('Helvetica').fontSize(10).text(resumoClinico.trim(), 50, y, { width: W });
      y += doc.heightOfString(resumoClinico.trim(), { width: W }) + 10;
    }

    // ── Observações ───────────────────────────────────────────────────────────
    if (observacoes?.trim()) {
      hr(y);
      y += 14;
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('OBSERVAÇÕES:', 50, y);
      y += 18;
      doc.font('Helvetica').fontSize(10).text(observacoes.trim(), 50, y, { width: W });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footY = doc.page.height - 52;
    hr(footY - 10);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRAY)
       .text('Documento gerado por farmacêutico responsável — Telefarmácia', 50, footY, { align: 'center', width: W });

    doc.end();
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

// ── Recibo PDF (paciente) ─────────────────────────────────────────────────────
// POST /api/consulta/:id/recibo/pdf?tipo=agendada|urgente
// Apenas o paciente dono (ou titular do dependente), apenas consulta concluída.
// Documento financeiro — sem dados clínicos. Gerado sob demanda, direto na
// resposta (sem gravar arquivo em disco nem URL pública).

export const gerarReciboPdf = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  const { id }    = req.params;
  const { tipo }  = req.query;
  const patientId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    const table = tableName(tipo);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT c.status, c."pacienteId", c."farmaceuticoId", c."dependentId", c."creditoDebitado"::float AS credito,
              ${tipo === 'agendada' ? 'c."dataHora" as data_hora' : 'COALESCE(c."aceitoEm", c."criadoEm") as data_hora'},
              u.name as "pacienteNome"
       FROM "${table}" c
       JOIN "User" u ON u.id = c."pacienteId"
       WHERE c.id = $1`,
      id
    );
    if (!rows.length) return res.status(404).json({ error: 'Consulta não encontrada.' });
    const row = rows[0];

    let dependenteNome = null;
    let isOwner = row.pacienteId === patientId;
    if (!isOwner && row.dependentId) {
      const dep = await prisma.dependentProfile.findUnique({
        where:  { id: row.dependentId },
        select: { ownerId: true, nome: true },
      });
      if (dep?.ownerId === patientId) {
        isOwner = true;
        dependenteNome = dep.nome;
      }
    }
    if (!isOwner) return res.status(403).json({ error: 'Acesso negado.' });

    if (row.status !== 'concluido') {
      return res.status(400).json({ error: 'Recibo disponível apenas para consultas concluídas.' });
    }

    const [pharmProfile, pharmUser] = await Promise.all([
      row.farmaceuticoId
        ? prisma.pharmacistProfile.findUnique({ where: { userId: row.farmaceuticoId }, select: { crfNumber: true, crfUF: true } })
        : null,
      row.farmaceuticoId
        ? prisma.user.findUnique({ where: { id: row.farmaceuticoId }, select: { name: true } })
        : null,
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recibo-${id}.pdf"`);

    await buildReciboPdf({
      out:           res,
      pacienteNome:  row.pacienteNome,
      dependenteNome,
      dataHora:      row.data_hora,
      farmNome:      pharmUser?.name ?? '—',
      farmCrf:       pharmProfile ? `${pharmProfile.crfUF}-${pharmProfile.crfNumber}` : '—',
      tipo,
      valor:         Number(row.credito),
      consultaId:    id,
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return res.status(500).json({ error: 'Erro ao gerar recibo.' });
    res.end();
  }
};

async function buildReciboPdf({ out, pacienteNome, dependenteNome, dataHora, farmNome, farmCrf, tipo, valor, consultaId }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(out);

    const W        = doc.page.width - 100;
    const dateStr  = new Date(dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const emissaoStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const valorStr = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const VIOLET   = '#7c3aed';
    const DARK     = '#111827';
    const GRAY     = '#6b7280';
    const DIVIDER  = '#e5e7eb';

    doc.rect(50, 45, W, 65).fill(VIOLET);
    doc.fillColor('white')
       .font('Helvetica-Bold').fontSize(20).text('FarmaConsulta', 50, 57, { align: 'center', width: W })
       .font('Helvetica').fontSize(11).text('Recibo de Consulta Farmacêutica', 50, 83, { align: 'center', width: W });

    const iY = 128;
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Paciente:', 50, iY);
    doc.font('Helvetica').text(dependenteNome ?? pacienteNome, 115, iY);
    if (dependenteNome) {
      doc.font('Helvetica-Bold').text('Titular da conta:', 50, iY + 16);
      doc.font('Helvetica').text(pacienteNome, 150, iY + 16);
    }

    let y = iY + (dependenteNome ? 40 : 24);
    const hr = (atY) => doc.moveTo(50, atY).lineTo(50 + W, atY).strokeColor(DIVIDER).lineWidth(1).stroke();
    hr(y);
    y += 16;

    const row = (label, value) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(label, 50, y);
      doc.font('Helvetica').text(value, 200, y);
      y += 20;
    };

    row('Farmacêutico(a):', farmNome);
    row('CRF:', farmCrf);
    row('Tipo de consulta:', tipo === 'urgente' ? 'Urgente' : 'Agendada');
    row('Data/hora da consulta:', dateStr);
    row('Valor pago:', valorStr);
    row('Identificador da consulta:', consultaId);
    row('Data de emissão:', emissaoStr);

    y += 10;
    hr(y);
    y += 14;
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRAY)
       .text('Este recibo é um comprovante financeiro e não contém informações clínicas da consulta.', 50, y, { width: W });

    const footY = doc.page.height - 70;
    hr(footY - 10);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRAY)
       .text('FarmaConsulta — Telefarmácia', 50, footY, { align: 'center', width: W });

    doc.end();
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

// ── GET /uploads/receitas/:filename (autenticado) ───────────────────────────
// Serve receita/encaminhamento em PDF apenas para o paciente dono (ou titular
// do dependente) e para o farmacêutico responsável pela consulta.

export const getDocumentoUpload = async (req, res) => {
  const { filename } = req.params;
  const match = /^(receita|encaminhamento)-([0-9a-f-]{36})\.pdf$/i.exec(filename);
  if (!match) return res.status(404).json({ error: 'Arquivo não encontrado.' });
  const [, , consultaId] = match;

  try {
    const [agendada, urgente] = await Promise.all([
      prisma.filaAgendada.findUnique({
        where:   { id: consultaId },
        include: { dependent: { select: { ownerId: true } } },
      }),
      prisma.filaUrgente.findUnique({
        where:   { id: consultaId },
        include: { dependent: { select: { ownerId: true } } },
      }),
    ]);
    const fila = agendada ?? urgente;
    if (!fila) return res.status(404).json({ error: 'Arquivo não encontrado.' });

    const userId = req.user.id;
    const isPacienteDono = fila.pacienteId === userId || fila.dependent?.ownerId === userId;
    let temAcessoFarmaceutico = fila.farmaceuticoId === userId;

    // Continuidade do cuidado: farmacêutico com atendimento ATIVO no mesmo
    // paciente pode ver documentos de consultas anteriores dele (mesmo
    // padrão de acesso usado em getHistoricoCompleto).
    if (!temAcessoFarmaceutico && req.user.role === 'FARMACEUTICO') {
      const ativa = await prisma.$queryRawUnsafe(
        `SELECT 1 FROM "FilaAgendada" WHERE "pacienteId" = $1 AND "farmaceuticoId" = $2 AND status IN ('aceito', 'em_atendimento')
         UNION SELECT 1 FROM "FilaUrgente" WHERE "pacienteId" = $1 AND "farmaceuticoId" = $2 AND status IN ('aceito', 'em_atendimento')
         LIMIT 1`,
        fila.pacienteId, userId
      );
      temAcessoFarmaceutico = ativa.length > 0;
    }

    if (!isPacienteDono && !temAcessoFarmaceutico) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const UPLOAD_DIR  = process.env.UPLOAD_DIR || join(__dirname, '../../../uploads');
    const filepath    = join(UPLOAD_DIR, 'receitas', filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Arquivo não encontrado.' });

    res.setHeader('Content-Type', 'application/pdf');
    createReadStream(filepath).pipe(res);
  } catch (err) {
    console.error('getDocumentoUpload error:', err);
    return res.status(500).json({ error: 'Erro ao buscar documento.' });
  }
};
