import { PrismaClient } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const prisma      = new PrismaClient();
const __dirname   = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR  = process.env.UPLOAD_DIR || join(__dirname, '../../../uploads');

const VERSAO_TERMOS = process.env.TERMOS_VERSAO || '1.0';

function validarCPF(raw) {
  const cpf = raw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  if (rem !== parseInt(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem >= 10) rem = 0;
  return rem === parseInt(cpf[10]);
}

export const createPerfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      nome_completo, data_nascimento, genero, cpf: cpfRaw,
      telefone, cep, logradouro, numero, complemento, bairro, cidade, estado,
      aceite_termos,
    } = req.body;

    if (!nome_completo?.trim() || !data_nascimento || !genero?.trim() || !cpfRaw) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }
    if (!aceite_termos) {
      return res.status(422).json({ error: 'Aceite dos termos é obrigatório.' });
    }

    const nascDate = new Date(data_nascimento);
    if (isNaN(nascDate.getTime())) {
      return res.status(400).json({ error: 'Data de nascimento inválida.' });
    }
    const anosNasc = (new Date() - nascDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (anosNasc < 0 || anosNasc > 120) {
      return res.status(400).json({ error: 'Data de nascimento fora do intervalo permitido.' });
    }

    const cpf = cpfRaw.replace(/\D/g, '');
    if (!validarCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    const existing = await prisma.pacienteProfile.findUnique({ where: { cpf } });
    if (existing) {
      return res.status(409).json({ error: 'CPF já cadastrado.' });
    }

    const perfil = await prisma.pacienteProfile.create({
      data: {
        userId,
        nomeCompleto: nome_completo.trim(),
        dataNascimento: nascDate,
        genero: genero.trim(),
        cpf,
        telefone: telefone?.replace(/\D/g, '') || null,
        cep: cep?.replace(/\D/g, '') || null,
        logradouro: logradouro?.trim() || null,
        numero: numero?.trim() || null,
        complemento: complemento?.trim() || null,
        bairro: bairro?.trim() || null,
        cidade: cidade?.trim() || null,
        estado: estado?.trim() || null,
        aceiteTermos: true,
        dataAceite: new Date(),
        versaoTermos: VERSAO_TERMOS,
      },
    });

    return res.status(201).json({ success: true, paciente_id: perfil.id });
  } catch (error) {
    console.error('Erro ao criar perfil de paciente:', error);
    return res.status(500).json({ error: 'Erro ao salvar perfil.' });
  }
};

export const getPerfil = async (req, res) => {
  try {
    const perfil = await prisma.pacienteProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!perfil) return res.status(404).json({ error: 'Perfil não encontrado.' });

    let peso = null;
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT peso FROM "PacienteProfile" WHERE "userId" = $1`, req.user.id
      );
      if (rows.length > 0) peso = rows[0].peso;
    } catch {}

    return res.status(200).json({
      nome_completo:    perfil.nomeCompleto,
      data_nascimento:  perfil.dataNascimento,
      genero:           perfil.genero,
      cpf:              perfil.cpf,
      telefone:         perfil.telefone,
      cep:              perfil.cep,
      logradouro:       perfil.logradouro,
      numero:           perfil.numero,
      complemento:      perfil.complemento,
      bairro:           perfil.bairro,
      cidade:           perfil.cidade,
      estado:           perfil.estado,
      aceite_termos:    perfil.aceiteTermos,
      versao_termos:    perfil.versaoTermos,
      data_aceite:      perfil.dataAceite,
      peso,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
};

// ── GET /api/paciente/historico ──────────────────────────────────────────────
// UNION das três fontes: Appointment (legado) + FilaAgendada + FilaUrgente

export const getHistorico = async (req, res) => {
  if (req.user.role !== 'PACIENTE') {
    return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  }
  const patientId = req.user.id;

  try {
    const [appointments, agendadas, urgentes] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        include: {
          pharmacist: { select: { name: true } },
          avaliacao:  { select: { nota: true, comentario: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.filaAgendada.findMany({
        where: { pacienteId: patientId },
        include: { farmaceutico: { select: { name: true } } },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.filaUrgente.findMany({
        where: { pacienteId: patientId },
        include: { farmaceutico: { select: { name: true } } },
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    const normalized = [
      ...appointments.map((a) => ({
        id:              a.id,
        tipo:            'appointment',
        dataHora:        a.dateTime,
        criadoEm:        a.createdAt,
        status:          a.status,
        farmaceutico:    a.pharmacist ? { name: a.pharmacist.name } : null,
        recommendations: a.recommendations ?? null,
        avaliacao:       a.avaliacao ?? null,
        creditoDebitado: null,
      })),
      ...agendadas.map((f) => ({
        id:              f.id,
        tipo:            'agendada',
        dataHora:        f.dataHora,
        criadoEm:        f.criadoEm,
        status:          f.status,
        farmaceutico:    f.farmaceutico ? { name: f.farmaceutico.name } : null,
        recommendations: null,
        avaliacao:       null,
        creditoDebitado: Number(f.creditoDebitado),
      })),
      ...urgentes.map((f) => ({
        id:              f.id,
        tipo:            'urgente',
        dataHora:        f.criadoEm,
        criadoEm:        f.criadoEm,
        status:          f.status,
        farmaceutico:    f.farmaceutico ? { name: f.farmaceutico.name } : null,
        recommendations: null,
        avaliacao:       null,
        creditoDebitado: Number(f.creditoDebitado),
      })),
    ].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

    return res.status(200).json(normalized);
  } catch (err) {
    console.error('getHistorico error:', err);
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
};

// ── GET /api/paciente/agendamentos (filtros + paginação) ─────────────────────

export const getAgendamentos = async (req, res) => {
  if (req.user.role !== 'PACIENTE') {
    return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  }
  const patientId = req.user.id;
  console.log('[getAgendamentos] userId da sessão (JWT):', patientId, '| email:', req.user.email);
  const { de, ate, status, page = '1', limit = '10', dependentId } = req.query;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;

  try {
    // Se dependentId informado, valida posse antes de qualquer query
    if (dependentId) {
      const dep = await prisma.dependentProfile.findFirst({
        where: { id: dependentId, ownerId: patientId },
      });
      if (!dep) {
        return res.status(403).json({ error: 'Dependente não encontrado ou sem permissão.' });
      }
    }

    // Filtro de dependentId: null = IS NULL (titular), string = valor exato
    const depFilter = dependentId ? dependentId : null;

    const [appointments, agendadas, urgentes] = await Promise.all([
      // Appointments legados não têm dependentId — exibir somente para titular
      dependentId
        ? Promise.resolve([])
        : prisma.appointment.findMany({
            where: { patientId },
            include: {
              pharmacist: { select: { name: true } },
              avaliacao:  { select: { nota: true, comentario: true } },
            },
            orderBy: { createdAt: 'desc' },
          }),
      prisma.filaAgendada.findMany({
        where: { pacienteId: patientId, dependentId: depFilter },
        include: { farmaceutico: { select: { name: true } } },
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.filaUrgente.findMany({
        where: { pacienteId: patientId, dependentId: depFilter },
        include: { farmaceutico: { select: { name: true } } },
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    // Busca receitaPdfUrl + pessoaNome + dependentId em lote para itens de fila
    const urlMap  = {};
    const pessoaMap = {};
    const depIdMap  = {};
    try {
      const agIds = agendadas.map((f) => f.id);
      const urIds = urgentes.map((f) => f.id);
      const [rowsA, rowsU] = await Promise.all([
        agIds.length > 0
          ? prisma.$queryRawUnsafe(
              `SELECT id, "receita_pdf_url", triagem->>'paciente_nome' AS pessoa_nome, "dependentId"
               FROM "FilaAgendada" WHERE id = ANY($1::text[])`,
              agIds
            )
          : Promise.resolve([]),
        urIds.length > 0
          ? prisma.$queryRawUnsafe(
              `SELECT id, "receita_pdf_url", triagem->>'paciente_nome' AS pessoa_nome, "dependentId"
               FROM "FilaUrgente" WHERE id = ANY($1::text[])`,
              urIds
            )
          : Promise.resolve([]),
      ]);
      [...rowsA, ...rowsU].forEach((r) => {
        if (r.receita_pdf_url) urlMap[r.id]  = r.receita_pdf_url;
        if (r.pessoa_nome)     pessoaMap[r.id] = r.pessoa_nome;
        if (r.dependentId)     depIdMap[r.id]  = r.dependentId;
      });
    } catch {}

    let normalized = [
      ...appointments.map((a) => ({
        id: a.id, tipo: 'appointment',
        dataHora: a.dateTime, criadoEm: a.createdAt,
        status: a.status,
        farmaceutico:    a.pharmacist ? { name: a.pharmacist.name } : null,
        recommendations: a.recommendations ?? null,
        avaliacao:       a.avaliacao ?? null,
        creditoDebitado: null,
        receitaPdfUrl:   null,
        meetLink:        a.googleMeetLink ?? null,
      })),
      ...agendadas.map((f) => ({
        id: f.id, tipo: 'agendada',
        dataHora: f.dataHora, criadoEm: f.criadoEm,
        status: f.status,
        farmaceutico:    f.farmaceutico ? { name: f.farmaceutico.name } : null,
        recommendations: null, avaliacao: null,
        creditoDebitado: Number(f.creditoDebitado),
        receitaPdfUrl:   urlMap[f.id]   ?? null,
        pessoaNome:      pessoaMap[f.id] ?? null,
        dependentId:     depIdMap[f.id]  ?? null,
      })),
      ...urgentes.map((f) => ({
        id: f.id, tipo: 'urgente',
        dataHora: f.criadoEm, criadoEm: f.criadoEm,
        status: f.status,
        farmaceutico:    f.farmaceutico ? { name: f.farmaceutico.name } : null,
        recommendations: null, avaliacao: null,
        creditoDebitado: Number(f.creditoDebitado),
        receitaPdfUrl:   urlMap[f.id]   ?? null,
        pessoaNome:      pessoaMap[f.id] ?? null,
        dependentId:     depIdMap[f.id]  ?? null,
      })),
    ].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

    if (de) {
      const deDate = new Date(`${de}T00:00:00-03:00`);
      normalized = normalized.filter((a) => new Date(a.criadoEm) >= deDate);
    }
    if (ate) {
      const ateDate = new Date(`${ate}T23:59:59-03:00`);
      normalized = normalized.filter((a) => new Date(a.criadoEm) <= ateDate);
    }
    if (status) {
      normalized = normalized.filter((a) => a.status.toLowerCase() === status.toLowerCase());
    }

    const total = normalized.length;
    const items = normalized.slice(skip, skip + limitNum);

    console.log('[getAgendamentos] retornando', total, 'registro(s) para userId:', patientId);
    console.log('[getAgendamentos] pacienteIds agendadas:', agendadas.map((f) => f.pacienteId));
    console.log('[getAgendamentos] pacienteIds urgentes:', urgentes.map((f) => f.pacienteId));
    console.log('[getAgendamentos] patientIds appointments:', appointments.map((a) => a.patientId));

    return res.status(200).json({
      items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasMore: skip + limitNum < total,
    });
  } catch (err) {
    console.error('getAgendamentos error:', err);
    return res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
};

// ── GET /api/pacientes/dados-saude ──────────────────────────────────────────

export const getDadosSaudeTitular = async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "dados_saude" FROM "PacienteProfile" WHERE "userId" = $1`,
      req.user.id
    );
    const dadosSaude = rows.length > 0 ? (rows[0].dados_saude ?? {}) : {};
    return res.status(200).json({ dadosSaude });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar dados de saúde.' });
  }
};

// ── PATCH /api/pacientes/dados-saude ────────────────────────────────────────

export const saveDadosSaudeTitular = async (req, res) => {
  const { dadosSaude } = req.body;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "PacienteProfile" SET "dados_saude" = $1::jsonb WHERE "userId" = $2`,
      JSON.stringify(dadosSaude ?? {}), req.user.id
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar dados de saúde.' });
  }
};

export const updatePerfil = async (req, res) => {
  try {
    const existing = await prisma.pacienteProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Perfil não encontrado.' });

    // cpf e dataNascimento são imutáveis — ignorados no PUT
    const {
      nome_completo, genero,
      telefone, cep, logradouro, numero, complemento, bairro, cidade, estado,
    } = req.body;

    await prisma.pacienteProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(nome_completo?.trim()     && { nomeCompleto: nome_completo.trim() }),
        ...(genero?.trim()            && { genero: genero.trim() }),
        ...(telefone !== undefined    && { telefone: telefone?.replace(/\D/g, '') || null }),
        ...(cep !== undefined         && { cep: cep?.replace(/\D/g, '') || null }),
        ...(logradouro !== undefined  && { logradouro: logradouro?.trim() || null }),
        ...(numero !== undefined      && { numero: numero?.trim() || null }),
        ...(complemento !== undefined && { complemento: complemento?.trim() || null }),
        ...(bairro !== undefined      && { bairro: bairro?.trim() || null }),
        ...(cidade !== undefined      && { cidade: cidade?.trim() || null }),
        ...(estado !== undefined      && { estado: estado?.trim() || null }),
      },
    });

    return res.status(200).json({ message: 'Cadastro atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
};

// ── PATCH /api/pacientes/perfil — permite definir data_nascimento quando ausente ─
export const patchNascimento = async (req, res) => {
  try {
    const perfil = await prisma.pacienteProfile.findUnique({ where: { userId: req.user.id } });
    if (!perfil) return res.status(404).json({ error: 'Perfil não encontrado.' });

    const { data_nascimento } = req.body ?? {};
    if (!data_nascimento) return res.status(400).json({ error: 'data_nascimento é obrigatória.' });

    const nasc = new Date(data_nascimento);
    if (isNaN(nasc.getTime())) return res.status(400).json({ error: 'Data inválida.' });
    const hoje = new Date();
    const anosAtras = (hoje - nasc) / (1000 * 60 * 60 * 24 * 365.25);
    if (anosAtras < 0 || anosAtras > 120) {
      return res.status(400).json({ error: 'Data fora do intervalo permitido.' });
    }

    await prisma.pacienteProfile.update({
      where: { userId: req.user.id },
      data:  { dataNascimento: nasc },
    });

    return res.status(200).json({ message: 'Data de nascimento atualizada.' });
  } catch (error) {
    console.error('Erro ao atualizar nascimento:', error);
    return res.status(500).json({ error: 'Erro ao atualizar data de nascimento.' });
  }
};

// ── GET /api/paciente/consulta/:id?tipo=agendada|urgente|appointment ─────────

export const getConsultaDetalhesPaciente = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  const { id }     = req.params;
  const { tipo }   = req.query;
  const patientId  = req.user.id;

  if (!['agendada', 'urgente', 'appointment'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo inválido.' });
  }

  try {
    if (tipo === 'appointment') {
      const a = await prisma.appointment.findFirst({
        where:   { id, patientId },
        include: { pharmacist: { select: { name: true } } },
      });
      if (!a) return res.status(404).json({ error: 'Consulta não encontrada.' });
      return res.status(200).json({
        id, tipo,
        dataHora:          a.dateTime,
        status:            a.status,
        pessoaNome:        null,
        dependentId:       null,
        creditoDebitado:   null,
        meetLink:          a.googleMeetLink ?? null,
        observacoes:       a.recommendations ?? null,
        motivo:            null,
        receita:           [],
        receitaPdfUrl:     null,
        motivoCancelamento: null,
        finalizacao:       null,
        farmaceutico:      a.pharmacist ? { nome: a.pharmacist.name } : null,
      });
    }

    const tableName = tipo === 'urgente' ? 'FilaUrgente' : 'FilaAgendada';
    const model     = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;

    const fila = await model.findUnique({
      where:   { id },
      include: {
        farmaceutico: { select: { name: true } },
        dependent:    { select: { id: true, nome: true, ownerId: true } },
      },
    });

    if (!fila) return res.status(404).json({ error: 'Consulta não encontrada.' });
    if (fila.pacienteId !== patientId && fila.dependent?.ownerId !== patientId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    let observacoes = null, motivo = null, receita = [], receitaPdfUrl = null,
        encaminhamentoPdfUrl = null,
        motivoCancelamento = null, finalizacao = null, pessoaNome = null,
        whatsappContato = null, modalidadeAtend = 'whatsapp',
        remarcacoes = 0, remarcacaoPendente = null, retornoSugerido = null, retornoDispensado = false;
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "observacoes", "motivo", "receita", "receita_pdf_url", "encaminhamento_pdf_url",
                "motivo_cancelamento", "finalizacao",
                triagem->>'paciente_nome' AS pessoa_nome,
                "whatsapp_contato", "modalidade_atend",
                "remarcacoes", "remarcacao_pendente",
                "retorno_sugerido", "retorno_dispensado"
         FROM "${tableName}" WHERE id = $1`, id
      );
      if (rows.length > 0) {
        observacoes          = rows[0].observacoes              ?? null;
        motivo               = rows[0].motivo                   ?? null;
        receita              = rows[0].receita                  ?? [];
        receitaPdfUrl        = rows[0].receita_pdf_url          ?? null;
        encaminhamentoPdfUrl = rows[0].encaminhamento_pdf_url   ?? null;
        motivoCancelamento   = rows[0].motivo_cancelamento      ?? null;
        finalizacao          = rows[0].finalizacao              ?? null;
        pessoaNome           = rows[0].pessoa_nome              ?? null;
        whatsappContato      = rows[0].whatsapp_contato         ?? null;
        modalidadeAtend      = rows[0].modalidade_atend         ?? 'whatsapp';
        remarcacoes          = Number(rows[0].remarcacoes       ?? 0);
        remarcacaoPendente   = rows[0].remarcacao_pendente      ?? null;
        retornoSugerido      = rows[0].retorno_sugerido         ?? null;
        retornoDispensado    = rows[0].retorno_dispensado       ?? false;
      }
    } catch {}

    return res.status(200).json({
      id, tipo,
      dataHora:          tipo === 'urgente' ? (fila.aceitoEm ?? fila.criadoEm) : fila.dataHora,
      status:            fila.status,
      pessoaNome:        pessoaNome ?? fila.dependent?.nome ?? null,
      dependentId:       fila.dependentId ?? null,
      creditoDebitado:   Number(fila.creditoDebitado),
      meetLink:          null,
      observacoes,
      motivo,
      receita:              Array.isArray(receita) ? receita : [],
      receitaPdfUrl,
      encaminhamentoPdfUrl,
      motivoCancelamento,
      finalizacao,
      farmaceutico:      fila.farmaceutico ? { nome: fila.farmaceutico.name } : null,
      whatsappContato,
      modalidadeAtend,
      remarcacoes,
      remarcacaoPendente,
      retornoSugerido,
      retornoDispensado,
    });
  } catch (err) {
    console.error('getConsultaDetalhesPaciente error:', err);
    return res.status(500).json({ error: 'Erro ao buscar detalhes.' });
  }
};

// ── GET /api/paciente/consulta/:id/pdf?tipo=agendada|urgente ────────────────

export const getReceitaPdfPaciente = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  const { id }      = req.params;
  const { tipo, doc = 'receita' } = req.query;
  const patientId   = req.user.id;

  if (!['agendada', 'urgente'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo inválido.' });
  }
  if (!['receita', 'encaminhamento'].includes(doc)) {
    return res.status(400).json({ error: 'doc inválido.' });
  }

  try {
    const tableName = tipo === 'urgente' ? 'FilaUrgente' : 'FilaAgendada';
    const model     = tipo === 'urgente' ? prisma.filaUrgente : prisma.filaAgendada;

    const fila = await model.findUnique({
      where:   { id },
      include: { dependent: { select: { ownerId: true } } },
    });

    if (!fila) return res.status(404).json({ error: 'Consulta não encontrada.' });
    if (fila.pacienteId !== patientId && fila.dependent?.ownerId !== patientId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const col = doc === 'encaminhamento' ? '"encaminhamento_pdf_url"' : '"receita_pdf_url"';
    const rows = await prisma.$queryRawUnsafe(
      `SELECT ${col} AS pdf_url FROM "${tableName}" WHERE id = $1`, id
    );
    const pdfUrl = rows[0]?.pdf_url ?? null;
    if (!pdfUrl) return res.status(404).json({ error: 'PDF não encontrado.' });

    const relativePath = pdfUrl.replace(/^\/uploads\//, '');
    const filepath     = join(UPLOAD_DIR, relativePath);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Arquivo não encontrado.' });

    const filename = doc === 'encaminhamento' ? `encaminhamento-${id}.pdf` : `receita-${id}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    createReadStream(filepath).pipe(res);
  } catch (err) {
    console.error('getReceitaPdfPaciente error:', err);
    return res.status(500).json({ error: 'Erro ao baixar PDF.' });
  }
};

// ── GET /api/paciente/proxima-consulta ──────────────────────────────────────

export const getProximaConsulta = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  const patientId = req.user.id;

  try {
    const agora = new Date();
    const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);

    const proxima = await prisma.filaAgendada.findFirst({
      where:   { pacienteId: patientId, status: 'aceito', dataHora: { gt: agora, lte: em48h } },
      orderBy: { dataHora: 'asc' },
      include: { dependent: { select: { id: true, nome: true } } },
    });

    if (!proxima) return res.status(200).json(null);

    let pessoaNome = null;
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT triagem->>'paciente_nome' AS pessoa_nome FROM "FilaAgendada" WHERE id = $1`,
        proxima.id
      );
      pessoaNome = rows[0]?.pessoa_nome ?? null;
    } catch {}

    return res.status(200).json({
      id:          proxima.id,
      tipo:        'agendada',
      dataHora:    proxima.dataHora,
      pessoaNome:  pessoaNome ?? proxima.dependent?.nome ?? null,
      dependentId: proxima.dependentId ?? null,
    });
  } catch (err) {
    console.error('getProximaConsulta error:', err);
    return res.status(500).json({ error: 'Erro ao buscar próxima consulta.' });
  }
};

// GET /api/paciente/extrato
export const getExtrato = async (req, res) => {
  try {
    const pacienteId = req.user.id;

    const carteira = await prisma.carteira.findUnique({ where: { pacienteId } });
    if (!carteira) return res.json({ saldo: 0, transacoes: [] });

    const transacoes = await prisma.transacaoCarteira.findMany({
      where:   { carteiraId: carteira.id },
      orderBy: { criadoEm: 'desc' },
      take:    50,
    });

    return res.json({
      saldo:      parseFloat(carteira.saldo),
      transacoes: transacoes.map((t) => ({
        id:        t.id,
        tipo:      t.tipo,
        valor:     parseFloat(t.valor),
        saldoApos: parseFloat(t.saldoApos),
        descricao: t.descricao,
        criadoEm:  t.criadoEm,
      })),
    });
  } catch (err) {
    console.error('getExtrato error:', err);
    return res.status(500).json({ error: 'Erro ao buscar extrato.' });
  }
};

// GET /api/paciente/retorno-sugerido
export const getRetornoSugerido = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  const pacienteId = req.user.id;
  try {
    const agendadaRows = await prisma.$queryRawUnsafe(`
      SELECT fa.id, fa."dataHora", fa."retorno_sugerido", fa."farmaceuticoId",
             u.name AS farmaceutico_nome
      FROM "FilaAgendada" fa
      JOIN "User" u ON u.id = fa."farmaceuticoId"
      WHERE fa."pacienteId" = $1
        AND fa.status = 'concluido'
        AND fa."retorno_sugerido" IS NOT NULL
        AND (fa."retorno_dispensado" IS NULL OR fa."retorno_dispensado" = false)
      ORDER BY fa."dataHora" DESC
      LIMIT 1
    `, pacienteId);

    if (agendadaRows.length > 0) {
      const r = agendadaRows[0];
      return res.json({
        tipo: 'agendada', consultaId: r.id,
        retornoSugerido: r.retorno_sugerido,
        farmaceuticoId: r.farmaceuticoid,
        farmaceuticoNome: r.farmaceutico_nome,
      });
    }

    const urgenteRows = await prisma.$queryRawUnsafe(`
      SELECT fu.id, fu."criadoEm" AS data_hora, fu."retorno_sugerido", fu."farmaceuticoId",
             u.name AS farmaceutico_nome
      FROM "FilaUrgente" fu
      JOIN "User" u ON u.id = fu."farmaceuticoId"
      WHERE fu."pacienteId" = $1
        AND fu.status = 'concluido'
        AND fu."retorno_sugerido" IS NOT NULL
        AND (fu."retorno_dispensado" IS NULL OR fu."retorno_dispensado" = false)
      ORDER BY fu."criadoEm" DESC
      LIMIT 1
    `, pacienteId);

    if (urgenteRows.length > 0) {
      const r = urgenteRows[0];
      return res.json({
        tipo: 'urgente', consultaId: r.id,
        retornoSugerido: r.retorno_sugerido,
        farmaceuticoId: r.farmaceuticoid,
        farmaceuticoNome: r.farmaceutico_nome,
      });
    }

    return res.json(null);
  } catch (err) {
    console.error('getRetornoSugerido error:', err);
    return res.status(500).json({ error: 'Erro ao buscar retorno sugerido.' });
  }
};

// GET /api/paciente/documentos
export const getMeusDocumentos = async (req, res) => {
  if (req.user.role !== 'PACIENTE') return res.status(403).json({ error: 'Acesso restrito a pacientes.' });
  const pacienteId = req.user.id;
  const { dependentId, titular } = req.query;

  try {
    // Build per-table WHERE clause fragments and params
    const baseParams = [pacienteId];
    let agendadaFilter = '';
    let urgenteFilter  = '';

    if (titular === '1') {
      agendadaFilter = `AND fa."dependentId" IS NULL`;
      urgenteFilter  = `AND fu."dependentId" IS NULL`;
    } else if (dependentId) {
      baseParams.push(dependentId);
      agendadaFilter = `AND fa."dependentId" = $2`;
      urgenteFilter  = `AND fu."dependentId" = $2`;
    }

    const rows = await prisma.$queryRawUnsafe(`
      SELECT * FROM (
        SELECT
          fa.id,
          'agendada'::text                                            AS tipo,
          fa."dataHora"                                              AS data_hora,
          COALESCE(fa.triagem->>'paciente_nome', '')                 AS pessoa_nome,
          u.name                                                     AS farmaceutico_nome,
          fa.observacoes,
          fa.motivo,
          fa.receita_pdf_url,
          fa.encaminhamento_pdf_url,
          fa.receita                                                 AS receita,
          (fa.receita IS NOT NULL
            AND jsonb_typeof(fa.receita) = 'array'
            AND jsonb_array_length(fa.receita) > 0)                 AS has_receita
        FROM "FilaAgendada" fa
        LEFT JOIN "User" u ON u.id = fa."farmaceuticoId"
        WHERE fa."pacienteId" = $1
          AND fa.status = 'concluido'
          ${agendadaFilter}

        UNION ALL

        SELECT
          fu.id,
          'urgente'::text                                            AS tipo,
          fu."criadoEm"                                             AS data_hora,
          COALESCE(fu.triagem->>'paciente_nome', '')                AS pessoa_nome,
          u.name                                                    AS farmaceutico_nome,
          fu.observacoes,
          fu.motivo,
          fu.receita_pdf_url,
          fu.encaminhamento_pdf_url,
          fu.receita                                                AS receita,
          (fu.receita IS NOT NULL
            AND jsonb_typeof(fu.receita) = 'array'
            AND jsonb_array_length(fu.receita) > 0)                AS has_receita
        FROM "FilaUrgente" fu
        LEFT JOIN "User" u ON u.id = fu."farmaceuticoId"
        WHERE fu."pacienteId" = $1
          AND fu.status = 'concluido'
          ${urgenteFilter}
      ) docs
      ORDER BY data_hora DESC
    `, ...baseParams);

    return res.json(rows.map((r) => ({
      id:                    r.id,
      tipo:                  r.tipo,
      dataHora:              r.data_hora,
      pessoaNome:            r.pessoa_nome || null,
      farmaceuticoNome:      r.farmaceutico_nome ?? null,
      observacoes:           r.observacoes ?? null,
      motivo:                r.motivo ?? null,
      receitaPdfUrl:         r.receita_pdf_url ?? null,
      encaminhamentoPdfUrl:  r.encaminhamento_pdf_url ?? null,
      receita:               Array.isArray(r.receita) ? r.receita : [],
      hasReceita:            Boolean(r.has_receita),
    })));
  } catch (err) {
    console.error('getMeusDocumentos error:', err);
    return res.status(500).json({ error: 'Erro ao buscar documentos.' });
  }
};

// PATCH /api/paciente/onboarding/concluir
export const concluirOnboarding = async (req, res) => {
  try {
    await prisma.pacienteProfile.update({
      where: { userId: req.user.id },
      data:  { onboardingConcluido: true },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('concluirOnboarding error:', err);
    return res.status(500).json({ error: 'Erro ao concluir onboarding.' });
  }
};
