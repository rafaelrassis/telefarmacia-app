import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: cria notificação apenas se não existir (deduplica por userId+tipo+consultaId)
export async function criarNotificacao({ userId, tipo, titulo, mensagem, consultaId = null }) {
  try {
    if (consultaId) {
      const existe = await prisma.notificacao.findFirst({ where: { userId, tipo, consultaId } });
      if (existe) return;
    }
    await prisma.notificacao.create({ data: { userId, tipo, titulo, mensagem, consultaId } });
  } catch {}
}

// GET /api/paciente/notificacoes
export const getNotificacoes = async (req, res) => {
  const userId = req.user.id;

  try {
    // Criar lembrete_24h para consultas agendadas/aceitas nas próximas 24h
    const em24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const agora  = new Date();

    const proximas = await prisma.filaAgendada.findMany({
      where: {
        pacienteId: userId,
        status:     'aceito',
        dataHora:   { gt: agora, lte: em24h },
      },
      select: { id: true, dataHora: true, dependent: { select: { nome: true } } },
    });

    for (const c of proximas) {
      const hora  = new Date(c.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const quem  = c.dependent?.nome ? ` para ${c.dependent.nome.split(' ')[0]}` : '';
      await criarNotificacao({
        userId,
        tipo:       'lembrete_24h',
        titulo:     'Consulta em breve',
        mensagem:   `Você tem consulta amanhã às ${hora}${quem}.`,
        consultaId: c.id,
      });
    }

    const notificacoes = await prisma.notificacao.findMany({
      where:   { userId },
      orderBy: { criadoEm: 'desc' },
      take:    30,
    });

    const naoLidas = notificacoes.filter((n) => !n.lida).length;

    return res.json({ naoLidas, notificacoes });
  } catch (err) {
    console.error('getNotificacoes error:', err);
    return res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
};

// PATCH /api/paciente/notificacoes/marcar-lidas
export const marcarLidas = async (req, res) => {
  const userId = req.user.id;
  try {
    await prisma.notificacao.updateMany({
      where: { userId, lida: false },
      data:  { lida: true },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('marcarLidas error:', err);
    return res.status(500).json({ error: 'Erro ao marcar notificações.' });
  }
};
