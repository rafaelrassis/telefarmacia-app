import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        dataNascimento: new Date(data_nascimento),
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
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
};

// ── GET /api/paciente/historico ──────────────────────────────────────────────
// UNION das três fontes: Appointment (legado) + FilaAgendada + FilaUrgente

export const getHistorico = async (req, res) => {
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
