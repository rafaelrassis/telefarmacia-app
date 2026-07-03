import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_DEPENDENTES = 6;

// ── Validação de entrada ─────────────────────────────────────────────────────

function validateNome(nome) {
  const t = (nome ?? '').trim();
  if (!t) return 'Nome é obrigatório.';
  if (t.length < 5) return 'Informe o nome completo (mínimo 5 caracteres).';
  if (!/^[A-Za-zÀ-ÿ\s]+$/.test(t)) return 'O nome deve conter apenas letras e espaços.';
  if (/(.)\1{3,}/iu.test(t)) return 'Informe o nome completo.';
  return null;
}

function validateDataNascimento(data) {
  if (!data) return 'Data de nascimento é obrigatória.';
  const nasc = new Date(data);
  if (isNaN(nasc.getTime())) return 'Data de nascimento inválida.';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (nasc >= hoje) return 'A data de nascimento não pode ser hoje ou futura.';
  const limite = new Date(hoje); limite.setFullYear(limite.getFullYear() - 120);
  if (nasc < limite) return 'Idade máxima permitida é de 120 anos.';
  return null;
}

// ── GET /api/dependentes ─────────────────────────────────────────────────────

export const listDependentes = async (req, res) => {
  const ownerId = req.user.id;
  try {
    const dependentes = await prisma.dependentProfile.findMany({
      where: { ownerId, ativo: true },
      orderBy: { criadoEm: 'asc' },
      select: {
        id: true,
        nome: true,
        dataNascimento: true,
        sexo: true,
        parentesco: true,
        ativo: true,
        aceitouResponsabilidade: true,
        dadosSaude: true,
        criadoEm: true,
      },
    });
    return res.status(200).json(dependentes);
  } catch (err) {
    console.error('listDependentes error:', err);
    return res.status(500).json({ error: 'Erro ao listar dependentes.' });
  }
};

// ── POST /api/dependentes ────────────────────────────────────────────────────

export const createDependente = async (req, res) => {
  const ownerId = req.user.id;
  const { nome, dataNascimento, sexo, parentesco, aceitouResponsabilidade } = req.body;

  const erroNome = validateNome(nome);
  if (erroNome) return res.status(400).json({ error: erroNome, field: 'nome' });
  const erroData = validateDataNascimento(dataNascimento);
  if (erroData) return res.status(400).json({ error: erroData, field: 'dataNascimento' });
  if (!sexo?.trim()) return res.status(400).json({ error: 'Sexo é obrigatório.', field: 'sexo' });
  if (!aceitouResponsabilidade) return res.status(400).json({ error: 'É necessário aceitar a responsabilidade pelo dependente.', field: 'aceitouResponsabilidade' });

  try {
    const count = await prisma.dependentProfile.count({ where: { ownerId, ativo: true } });
    if (count >= MAX_DEPENDENTES) {
      return res.status(409).json({ error: `Limite de ${MAX_DEPENDENTES} dependentes atingido.` });
    }

    const dep = await prisma.dependentProfile.create({
      data: {
        ownerId,
        nome: nome.trim(),
        dataNascimento: new Date(dataNascimento),
        sexo: sexo.trim(),
        parentesco: parentesco?.trim() || null,
        aceitouResponsabilidade: Boolean(aceitouResponsabilidade),
      },
    });
    return res.status(201).json(dep);
  } catch (err) {
    console.error('createDependente error:', err);
    return res.status(500).json({ error: 'Erro ao criar dependente.' });
  }
};

// ── PATCH /api/dependentes/:id ───────────────────────────────────────────────

export const updateDependente = async (req, res) => {
  const ownerId = req.user.id;
  const { id } = req.params;
  const { nome, dataNascimento, sexo, parentesco, aceitouResponsabilidade } = req.body;

  if (nome !== undefined) {
    const erroNome = validateNome(nome);
    if (erroNome) return res.status(400).json({ error: erroNome, field: 'nome' });
  }
  if (dataNascimento !== undefined) {
    const erroData = validateDataNascimento(dataNascimento);
    if (erroData) return res.status(400).json({ error: erroData, field: 'dataNascimento' });
  }

  try {
    const dep = await prisma.dependentProfile.findFirst({ where: { id, ownerId } });
    if (!dep) return res.status(404).json({ error: 'Dependente não encontrado.' });

    const updated = await prisma.dependentProfile.update({
      where: { id },
      data: {
        ...(nome?.trim()            && { nome: nome.trim() }),
        ...(dataNascimento          && { dataNascimento: new Date(dataNascimento) }),
        ...(sexo?.trim()            && { sexo: sexo.trim() }),
        ...(parentesco !== undefined && { parentesco: parentesco?.trim() || null }),
        ...(aceitouResponsabilidade !== undefined && { aceitouResponsabilidade: Boolean(aceitouResponsabilidade) }),
      },
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('updateDependente error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar dependente.' });
  }
};

// ── DELETE /api/dependentes/:id ──────────────────────────────────────────────

export const deleteDependente = async (req, res) => {
  const ownerId = req.user.id;
  const { id } = req.params;

  try {
    const dep = await prisma.dependentProfile.findFirst({ where: { id, ownerId } });
    if (!dep) return res.status(404).json({ error: 'Dependente não encontrado.' });

    await prisma.dependentProfile.update({ where: { id }, data: { ativo: false } });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteDependente error:', err);
    return res.status(500).json({ error: 'Erro ao remover dependente.' });
  }
};

// ── GET /api/dependentes/:id/saude ──────────────────────────────────────────

export const getDadosSaude = async (req, res) => {
  const ownerId = req.user.id;
  const { id } = req.params;

  try {
    const dep = await prisma.dependentProfile.findFirst({
      where: { id, ownerId },
      select: { dadosSaude: true },
    });
    if (!dep) return res.status(404).json({ error: 'Dependente não encontrado.' });

    return res.status(200).json({ dadosSaude: dep.dadosSaude ?? {} });
  } catch (err) {
    console.error('getDadosSaude error:', err);
    return res.status(500).json({ error: 'Erro ao buscar dados de saúde.' });
  }
};

// ── PATCH /api/dependentes/:id/saude ────────────────────────────────────────

export const saveDadosSaude = async (req, res) => {
  const ownerId = req.user.id;
  const { id } = req.params;
  const { dadosSaude } = req.body;

  try {
    const dep = await prisma.dependentProfile.findFirst({ where: { id, ownerId } });
    if (!dep) return res.status(404).json({ error: 'Dependente não encontrado.' });

    await prisma.dependentProfile.update({
      where: { id },
      data: { dadosSaude: dadosSaude ?? {} },
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('saveDadosSaude error:', err);
    return res.status(500).json({ error: 'Erro ao salvar dados de saúde.' });
  }
};
