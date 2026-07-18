import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HORARIO_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_HORARIOS = 6;
const MAX_LEMBRETES_ATIVOS = 20;
const MAX_MEDICAMENTO_LEN = 120;

// Valida medicamento/dose/horarios. Retorna { error } ou { medicamento, dose, horarios }.
function validarCampos({ medicamento, dose, horarios }) {
  const med = medicamento?.trim();
  if (!med) return { error: 'Medicamento é obrigatório.' };
  if (med.length > MAX_MEDICAMENTO_LEN) {
    return { error: `Medicamento deve ter no máximo ${MAX_MEDICAMENTO_LEN} caracteres.` };
  }
  if (!Array.isArray(horarios) || horarios.length === 0) {
    return { error: 'Informe ao menos um horário.' };
  }
  if (horarios.length > MAX_HORARIOS) {
    return { error: `Máximo de ${MAX_HORARIOS} horários por lembrete.` };
  }
  if (horarios.some((h) => typeof h !== 'string' || !HORARIO_REGEX.test(h))) {
    return { error: 'Horários devem estar no formato HH:MM.' };
  }
  return {
    medicamento: med,
    dose:        dose?.trim()?.slice(0, 120) || null,
    horarios:    [...new Set(horarios)].sort(),
  };
}

// GET /api/paciente/lembretes
export const listarLembretes = async (req, res) => {
  try {
    const lembretes = await prisma.lembreteMedicacao.findMany({
      where:   { pacienteId: req.user.id },
      include: { dependent: { select: { id: true, nome: true } } },
      orderBy: { criadoEm: 'desc' },
    });
    return res.json(lembretes);
  } catch (err) {
    console.error('listarLembretes error:', err);
    return res.status(500).json({ error: 'Erro ao buscar lembretes.' });
  }
};

// POST /api/paciente/lembretes
export const criarLembrete = async (req, res) => {
  try {
    const pacienteId = req.user.id;
    const { dependentId } = req.body;

    const campos = validarCampos(req.body);
    if (campos.error) return res.status(422).json({ error: campos.error });

    if (dependentId) {
      const dep = await prisma.dependentProfile.findFirst({ where: { id: dependentId, ownerId: pacienteId } });
      if (!dep) return res.status(403).json({ error: 'Sem permissão.' });
    }

    const ativos = await prisma.lembreteMedicacao.count({ where: { pacienteId, ativo: true } });
    if (ativos >= MAX_LEMBRETES_ATIVOS) {
      return res.status(422).json({ error: `Máximo de ${MAX_LEMBRETES_ATIVOS} lembretes ativos por usuário.` });
    }

    const lembrete = await prisma.lembreteMedicacao.create({
      data: {
        pacienteId,
        dependentId: dependentId || null,
        medicamento: campos.medicamento,
        dose:        campos.dose,
        horarios:    campos.horarios,
      },
      include: { dependent: { select: { id: true, nome: true } } },
    });
    return res.status(201).json(lembrete);
  } catch (err) {
    console.error('criarLembrete error:', err);
    return res.status(500).json({ error: 'Erro ao criar lembrete.' });
  }
};

// PATCH /api/paciente/lembretes/:id — edita medicamento, dose, horarios, ativo
export const atualizarLembrete = async (req, res) => {
  try {
    const pacienteId = req.user.id;
    const { id } = req.params;

    const lembrete = await prisma.lembreteMedicacao.findUnique({ where: { id } });
    if (!lembrete) return res.status(404).json({ error: 'Lembrete não encontrado.' });
    if (lembrete.pacienteId !== pacienteId) return res.status(403).json({ error: 'Sem permissão.' });

    const data = {};

    if (req.body.medicamento !== undefined || req.body.horarios !== undefined) {
      const campos = validarCampos({
        medicamento: req.body.medicamento !== undefined ? req.body.medicamento : lembrete.medicamento,
        dose:        req.body.dose        !== undefined ? req.body.dose        : lembrete.dose,
        horarios:    req.body.horarios    !== undefined ? req.body.horarios    : lembrete.horarios,
      });
      if (campos.error) return res.status(422).json({ error: campos.error });
      data.medicamento = campos.medicamento;
      data.dose        = campos.dose;
      data.horarios    = campos.horarios;
    } else if (req.body.dose !== undefined) {
      data.dose = req.body.dose?.trim()?.slice(0, 120) || null;
    }

    if (req.body.ativo !== undefined) {
      data.ativo = Boolean(req.body.ativo);
      if (data.ativo && !lembrete.ativo) {
        const ativos = await prisma.lembreteMedicacao.count({ where: { pacienteId, ativo: true } });
        if (ativos >= MAX_LEMBRETES_ATIVOS) {
          return res.status(422).json({ error: `Máximo de ${MAX_LEMBRETES_ATIVOS} lembretes ativos por usuário.` });
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }

    const atualizado = await prisma.lembreteMedicacao.update({
      where:   { id },
      data,
      include: { dependent: { select: { id: true, nome: true } } },
    });
    return res.json(atualizado);
  } catch (err) {
    console.error('atualizarLembrete error:', err);
    return res.status(500).json({ error: 'Erro ao atualizar lembrete.' });
  }
};

// DELETE /api/paciente/lembretes/:id
export const excluirLembrete = async (req, res) => {
  try {
    const { id } = req.params;

    const lembrete = await prisma.lembreteMedicacao.findUnique({ where: { id } });
    if (!lembrete) return res.status(404).json({ error: 'Lembrete não encontrado.' });
    if (lembrete.pacienteId !== req.user.id) return res.status(403).json({ error: 'Sem permissão.' });

    await prisma.lembreteMedicacao.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error('excluirLembrete error:', err);
    return res.status(500).json({ error: 'Erro ao excluir lembrete.' });
  }
};
