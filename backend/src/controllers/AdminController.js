import { PrismaClient } from '@prisma/client';
import { notifyPatientCancelamento } from '../services/emailService.js';

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────

async function cancelarConsultasFuturas(tx, pharmacistId) {
  const futuras = await tx.appointment.findMany({
    where: { pharmacistId, status: 'AGENDADO', dateTime: { gt: new Date() } },
    include: { patient: true },
  });

  if (futuras.length > 0) {
    await tx.appointment.updateMany({
      where: { id: { in: futuras.map((c) => c.id) } },
      data: { status: 'CANCELADO' },
    });
  }

  return futuras;
}

function notificarPacientesAsync(consultas, nomePharmaceutico) {
  for (const c of consultas) {
    notifyPatientCancelamento({
      email:              c.patient.email,
      nomePaciente:       c.patient.name,
      nomePharmaceutico,
      dateTime:           c.dateTime,
    }).catch(() => {});
  }
}

// ── endpoints existentes ─────────────────────────────────────────────────────

export const getStats = async (req, res) => {
  try {
    const [totalPatients, totalPharmacists, pendingApprovals, appointmentsByStatus] = await Promise.all([
      prisma.user.count({ where: { role: 'PACIENTE' } }),
      prisma.user.count({ where: { role: 'FARMACEUTICO' } }),
      prisma.pharmacistProfile.count({ where: { isApproved: false } }),
      prisma.appointment.groupBy({ by: ['status'], _count: { id: true } }),
    ]);

    const statusMap = {};
    appointmentsByStatus.forEach(({ status, _count }) => { statusMap[status] = _count.id; });

    return res.status(200).json({
      totalPatients,
      totalPharmacists,
      pendingApprovals,
      totalAppointments:     Object.values(statusMap).reduce((a, b) => a + b, 0),
      completedAppointments: statusMap['CONCLUIDO']  || 0,
      scheduledAppointments: statusMap['AGENDADO']   || 0,
      cancelledAppointments: statusMap['CANCELADO']  || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar métricas.' });
  }
};

export const listPharmacists = async (req, res) => {
  try {
    const pharmacists = await prisma.user.findMany({
      where: { role: 'FARMACEUTICO' },
      include: {
        pharmacistProfile: true,
        _count: { select: { appointmentsAsPharmacist: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(pharmacists);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar farmacêuticos.' });
  }
};

export const listPatients = async (req, res) => {
  try {
    const patients = await prisma.user.findMany({
      where: { role: 'PACIENTE' },
      include: { _count: { select: { appointmentsAsPatient: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(patients);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
};

export const listAllAppointments = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50')));

    const appointments = await prisma.appointment.findMany({
      include: {
        patient:    { select: { id: true, name: true, email: true } },
        pharmacist: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
    });
    return res.status(200).json(appointments);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar consultas.' });
  }
};

export const approvePharmacist = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    await prisma.pharmacistProfile.update({ where: { userId }, data: { isApproved: true } });
    return res.status(200).json({ message: 'Farmacêutico aprovado com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao aprovar farmacêutico.' });
  }
};

export const revokePharmacist = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    await prisma.pharmacistProfile.update({ where: { userId }, data: { isApproved: false } });
    return res.status(200).json({ message: 'Aprovação revogada.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao revogar aprovação.' });
  }
};

export const deletePharmacist = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { pharmacistProfile: true },
    });
    if (!user || user.role !== 'FARMACEUTICO') {
      return res.status(404).json({ error: 'Farmacêutico não encontrado.' });
    }

    let consultasCanceladas = [];

    await prisma.$transaction(async (tx) => {
      consultasCanceladas = await cancelarConsultasFuturas(tx, userId);
      await tx.availability.deleteMany({ where: { pharmacistId: userId } });
      await tx.pharmacistProfile.delete({ where: { userId } });
      await tx.user.update({ where: { id: userId }, data: { role: 'PACIENTE' } });
    });

    notificarPacientesAsync(consultasCanceladas, user.name);

    return res.status(200).json({
      message: 'Farmacêutico descadastrado. Conta convertida para paciente.',
      consultasCanceladas: consultasCanceladas.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao descadastrar farmacêutico.' });
  }
};

// ── novos endpoints v2 ───────────────────────────────────────────────────────

export const getMetricas = async (req, res) => {
  try {
    const [
      consultasRealizadas,
      consultasAgendadas,
      consultasCanceladas,
      pacientes,
      farmaceuticosAtivos,
      farmaceuticosPendentes,
    ] = await Promise.all([
      prisma.appointment.count({ where: { status: 'CONCLUIDO' } }),
      prisma.appointment.count({ where: { status: 'AGENDADO' } }),
      prisma.appointment.count({ where: { status: 'CANCELADO' } }),
      prisma.user.count({ where: { role: 'PACIENTE' } }),
      prisma.pharmacistProfile.count({ where: { isApproved: true } }),
      prisma.pharmacistProfile.count({ where: { isApproved: false } }),
    ]);

    return res.status(200).json({
      consultas_realizadas:   consultasRealizadas,
      consultas_agendadas:    consultasAgendadas,
      consultas_canceladas:   consultasCanceladas,
      usuarios_ativos:        { pacientes, farmaceuticos: farmaceuticosAtivos },
      farmaceuticos_pendentes: farmaceuticosPendentes,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar métricas.' });
  }
};

export const getDocumentos = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: id } });
    if (!profile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });
    if (!profile.urlDocIdentidade) return res.status(404).json({ error: 'Documentos ainda não enviados.' });

    const base = (process.env.BACKEND_URL || 'http://localhost:3000');
    return res.status(200).json({
      foto_rg_cnh: `${base}${profile.urlDocIdentidade}`,
      foto_crf:    `${base}${profile.urlDocCrf}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar documentos.' });
  }
};

export const setStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Ativo', 'Inativo'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use "Ativo" ou "Inativo".' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { pharmacistProfile: true },
    });
    if (!user?.pharmacistProfile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });

    const isAtivando = status === 'Ativo';
    let consultasCanceladas = [];

    if (!isAtivando) {
      // Inativando: cancela consultas futuras dentro de uma transação
      await prisma.$transaction(async (tx) => {
        consultasCanceladas = await cancelarConsultasFuturas(tx, id);
        await tx.pharmacistProfile.update({ where: { userId: id }, data: { isApproved: false } });
      });

      // Notifica pacientes afetados de forma assíncrona
      notificarPacientesAsync(consultasCanceladas, user.name);
    } else {
      await prisma.pharmacistProfile.update({ where: { userId: id }, data: { isApproved: true } });
    }

    return res.status(200).json({
      success: true,
      message: isAtivando
        ? 'Cadastro ativado com sucesso. Profissional liberado.'
        : `Farmacêutico inativado. ${consultasCanceladas.length} consulta(s) futura(s) cancelada(s).`,
      consultasCanceladas: consultasCanceladas.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
};

// Mantidos por compatibilidade com Módulo 3
export const listarPendentes = async (req, res) => {
  try {
    const pharmacists = await prisma.user.findMany({
      where: { role: 'FARMACEUTICO', pharmacistProfile: { isApproved: false } },
      include: { pharmacistProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(
      pharmacists.map((u) => ({
        id:          u.id,
        nome:        u.name,
        email:       u.email,
        crf_numero:  u.pharmacistProfile ? `${u.pharmacistProfile.crfNumber}/${u.pharmacistProfile.crfUF}` : null,
        createdAt:   u.createdAt,
        docs_enviados: Boolean(u.pharmacistProfile?.urlDocIdentidade),
        urls_documentos: {
          rg_cnh: u.pharmacistProfile?.urlDocIdentidade || null,
          crf:    u.pharmacistProfile?.urlDocCrf    || null,
        },
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar pendentes.' });
  }
};

export const ativarFarmaceutico = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await prisma.pharmacistProfile.findUnique({ where: { userId: id } });
    if (!profile) return res.status(404).json({ error: 'Farmacêutico não encontrado.' });
    await prisma.pharmacistProfile.update({ where: { userId: id }, data: { isApproved: true } });
    return res.status(200).json({ message: 'Cadastro ativado com sucesso. Profissional liberado.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao ativar farmacêutico.' });
  }
};


// ── Sistema de agendamentos ───────────────────────────────────────────────────

export const getSistemaStatus = async (req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'sistema_aberto' } });
    return res.status(200).json({ sistema_aberto: config ? config.value === 'true' : true });
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar status do sistema.' });
  }
};

export const toggleSistema = async (req, res) => {
  try {
    const { aberto } = req.body;
    if (typeof aberto !== 'boolean') {
      return res.status(400).json({ error: 'aberto deve ser true ou false.' });
    }
    await prisma.systemConfig.upsert({
      where:  { key: 'sistema_aberto' },
      update: { value: aberto ? 'true' : 'false' },
      create: { key: 'sistema_aberto', value: aberto ? 'true' : 'false' },
    });
    return res.status(200).json({ success: true, sistema_aberto: aberto });
  } catch {
    return res.status(500).json({ error: 'Erro ao atualizar status do sistema.' });
  }
};

export const getLogs = async (req, res) => {
  const { acao, de, ate, page = '1', limit = '50' } = req.query;
  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;

  try {
    const conditions = ['1=1'];
    const params     = [];

    if (acao) { conditions.push(`l.acao = $${params.length + 1}`); params.push(acao); }
    if (de)   { conditions.push(`l.criado_em >= $${params.length + 1}`); params.push(`${de}T00:00:00-03:00`); }
    if (ate)  { conditions.push(`l.criado_em <= $${params.length + 1}`); params.push(`${ate}T23:59:59-03:00`); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [countRow] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM log_acoes l ${where}`,
      ...params
    );
    const total = Number(countRow?.total ?? 0);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT l.id, l.consulta_id, l.usuario_id, l.role, l.acao, l.detalhes, l.criado_em,
              u.name AS usuario_nome
       FROM log_acoes l
       LEFT JOIN "User" u ON u.id::text = l.usuario_id
       ${where}
       ORDER BY l.criado_em DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params, limitNum, skip
    );

    return res.status(200).json({
      items: rows.map((r) => ({
        id:          r.id,
        consultaId:  r.consulta_id,
        usuarioId:   r.usuario_id,
        usuarioNome: r.usuario_nome ?? '—',
        role:        r.role,
        acao:        r.acao,
        detalhes:    r.detalhes ?? {},
        criadoEm:    r.criado_em,
      })),
      total,
      page: pageNum,
      hasMore: skip + limitNum < total,
    });
  } catch (err) {
    if (err.message?.includes('log_acoes') || err.message?.includes('does not exist')) {
      return res.status(200).json({
        items: [], total: 0, page: 1, hasMore: false,
        warning: 'Execute a migration para habilitar logs.',
      });
    }
    console.error('getLogs error:', err);
    return res.status(500).json({ error: 'Erro ao buscar logs.' });
  }
};
