import { PrismaClient } from '@prisma/client';
import { logAction } from '../utils/logAction.js';

const prisma = new PrismaClient();

// Versão em vigor — alterar aqui e em VITE_TERMOS_VERSAO para forçar novo aceite
const VERSAO_ATUAL = process.env.TERMOS_TELEFARMACIA_VERSAO || '1.0';

// GET /api/consent/telefarmacia
export const getConsentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const record = await prisma.consentRecord.findUnique({
      where: { userId_tipoTermo_versaoTermo: { userId, tipoTermo: 'telefarmacia', versaoTermo: VERSAO_ATUAL } },
    });
    return res.json({
      aceito:     Boolean(record),
      versao:     VERSAO_ATUAL,
      aceitoEm:   record?.aceitoEm ?? null,
    });
  } catch (err) {
    console.error('getConsentStatus:', err);
    return res.status(500).json({ error: 'Erro ao verificar consentimento.' });
  }
};

// POST /api/consent/telefarmacia
export const registrarConsentimento = async (req, res) => {
  try {
    const userId = req.user.id;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
             || req.socket?.remoteAddress
             || null;

    const record = await prisma.consentRecord.upsert({
      where:  { userId_tipoTermo_versaoTermo: { userId, tipoTermo: 'telefarmacia', versaoTermo: VERSAO_ATUAL } },
      update: { aceitoEm: new Date(), ip },
      create: { userId, tipoTermo: 'telefarmacia', versaoTermo: VERSAO_ATUAL, ip },
    });

    await logAction(prisma, {
      usuarioId: userId,
      role:      req.user.role,
      acao:      'lgpd_consent',
      detalhes:  { tipoTermo: 'telefarmacia', versaoTermo: VERSAO_ATUAL },
    });

    return res.json({ aceito: true, versao: VERSAO_ATUAL, aceitoEm: record.aceitoEm });
  } catch (err) {
    console.error('registrarConsentimento:', err);
    return res.status(500).json({ error: 'Erro ao registrar consentimento.' });
  }
};
