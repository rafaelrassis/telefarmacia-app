import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache em memória: endpoint é público e não pode virar vetor de carga no
// banco. Resposta contém apenas agregados — nenhum dado pessoal (LGPD).
const CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_AVALIACOES_PARA_NOTA = 10;
let cache = { data: null, ts: 0 };

// GET /api/public/stats — sem auth
export const getPublicStats = async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.ts < CACHE_TTL_MS) {
      return res.json(cache.data);
    }

    const statusConcluido = { in: ['concluido', 'CONCLUIDO'] };
    const [agendadas, urgentes, avaliacoesAgg] = await Promise.all([
      prisma.filaAgendada.count({ where: { status: statusConcluido } }),
      prisma.filaUrgente.count({ where: { status: statusConcluido } }),
      prisma.avaliacao.aggregate({ _avg: { nota: true }, _count: { nota: true } }),
    ]);

    const totalAvaliacoes = avaliacoesAgg._count.nota;
    // Threshold anti-número-frágil: nota média só é divulgada com volume mínimo
    const notaMedia = totalAvaliacoes >= MIN_AVALIACOES_PARA_NOTA
      ? Math.round(avaliacoesAgg._avg.nota * 10) / 10
      : null;

    const data = {
      consultasConcluidas: agendadas + urgentes,
      notaMedia,
      totalAvaliacoes,
    };
    cache = { data, ts: Date.now() };
    return res.json(data);
  } catch (err) {
    console.error('getPublicStats error:', err);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
};
