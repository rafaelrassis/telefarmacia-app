import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { logAction } from '../utils/logAction.js';
import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma    = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

const tableName = (tipo) => (tipo === 'urgente' ? 'FilaUrgente' : 'FilaAgendada');

// ── GET /api/consulta/:id?tipo=agendada|urgente ──────────────────────────────

export const getConsulta = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id } = req.params;
  const { tipo } = req.query;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

  try {
    let data;
    if (tipo === 'agendada') {
      data = await prisma.filaAgendada.findUnique({
        where:   { id },
        include: { paciente: { select: { id: true, name: true } } },
      });
    } else {
      data = await prisma.filaUrgente.findUnique({
        where:   { id },
        include: { paciente: { select: { id: true, name: true } } },
      });
    }
    if (!data) return res.status(404).json({ error: 'Consulta não encontrada.' });

    let observacoes = null, motivo = null, receita = [], receitaPdfUrl = null;
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "observacoes", "motivo", "receita", "receita_pdf_url" FROM "${tableName(tipo)}" WHERE id = $1`, id
      );
      if (rows.length > 0) {
        observacoes   = rows[0].observacoes    ?? null;
        motivo        = rows[0].motivo         ?? null;
        receita       = rows[0].receita        ?? [];
        receitaPdfUrl = rows[0].receita_pdf_url ?? null;
      }
    } catch {}

    return res.status(200).json({
      id, tipo,
      farmaceuticoId:  data.farmaceuticoId ?? null,
      pacienteId:      data.pacienteId,
      pacienteNome:    data.paciente?.name ?? '—',
      dataHora:        tipo === 'urgente' ? (data.aceitoEm ?? data.criadoEm) : data.dataHora,
      status:          data.status,
      motivo,
      observacoes,
      receita,
      receitaPdfUrl,
      creditoDebitado: Number(data.creditoDebitado),
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
  const { tipo, observacoes, motivo, receita } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });
  if (!observacoes?.trim()) return res.status(400).json({ error: 'Observações são obrigatórias para concluir.' });

  const validReceita = Array.isArray(receita) ? receita.filter((m) => m.medicamento?.trim()) : [];
  const receitaStr   = validReceita.length > 0 ? JSON.stringify(validReceita) : null;
  const table        = tableName(tipo);

  try {
    let count;
    try {
      if (receitaStr) {
        count = await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET status = 'concluido', "observacoes" = $1, "motivo" = $2, "receita" = $3::jsonb WHERE id = $4 AND "farmaceuticoId" = $5 AND status = 'em_atendimento'`,
          observacoes.trim(), motivo?.trim() || null, receitaStr, id, pharmacistId
        );
      } else {
        count = await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET status = 'concluido', "observacoes" = $1, "motivo" = $2 WHERE id = $3 AND "farmaceuticoId" = $4 AND status = 'em_atendimento'`,
          observacoes.trim(), motivo?.trim() || null, id, pharmacistId
        );
      }
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
  const { tipo } = req.body;
  const pharmacistId = req.user.id;
  if (!['agendada', 'urgente'].includes(tipo)) return res.status(400).json({ error: 'tipo inválido.' });

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

    const creditoDevolvido = Number(fila.creditoDebitado);
    await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'cancelado', detalhes: { tipo, cancelado_por: req.user.role } });
    if (creditoDevolvido > 0) {
      await logAction(prisma, { consultaId: id, usuarioId: pharmacistId, role: req.user.role, acao: 'reembolso', detalhes: { tipo, valor: creditoDevolvido } });
    }
    return res.status(200).json({ success: true, creditoDevolvido });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao cancelar consulta.' });
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

// ── GET /api/paciente/:id/historico (farmacêutico vê histórico do paciente) ──

export const getHistoricoPaciente = async (req, res) => {
  if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: 'Acesso negado.' });
  const { id: patientId } = req.params;

  try {
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

    const appointments = await prisma.appointment.findMany({
      where:   { patientId, status: { in: ['CONCLUIDO', 'CANCELADO'] } },
      select:  { id: true, dateTime: true, status: true, recommendations: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 20,
    });

    const normalized = [
      ...appointments.map((a) => ({
        id: a.id, tipo: 'appointment',
        data: a.dateTime, status: a.status,
        observacoes: a.recommendations ?? null, motivo: null,
        criadoEm: a.createdAt,
      })),
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
