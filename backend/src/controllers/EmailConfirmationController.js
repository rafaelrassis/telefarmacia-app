import { PrismaClient } from '@prisma/client';
import {
  generateVerificationToken,
  hashVerificationToken,
  verificationExpiresAt,
} from '../utils/emailVerificationToken.js';
import { sendVerificationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

const GENERIC_RESEND_MESSAGE = 'Se este e-mail estiver cadastrado e pendente de confirmação, enviamos um novo link.';

// ── Fluxo 2 — Confirmar e-mail (via token do e-mail) ────────────────────────

export const confirmarEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Link inválido ou expirado.' });
    }

    const tokenHash = hashVerificationToken(token);
    const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (!record) {
      return res.status(400).json({ error: 'Link inválido ou expirado.' });
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) {
      return res.status(400).json({ error: 'Link inválido ou expirado.' });
    }

    // Idempotente: um segundo clique no mesmo link (ou um link antigo de uma
    // conta já confirmada por outro meio, ex. login com Google) nunca deve
    // aparecer como erro — sempre redireciona para o login.
    if (user.emailVerified) {
      return res.status(200).json({ message: 'E-mail já confirmado. Faça login.' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Link inválido ou expirado.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    return res.status(200).json({ message: 'E-mail confirmado com sucesso. Faça login.' });
  } catch (error) {
    console.error('Erro ao confirmar e-mail:', error.message);
    return res.status(500).json({ error: 'Erro ao confirmar e-mail.' });
  }
};

// ── Fluxo 3 — Reenviar e-mail de confirmação (usuário deslogado/bloqueado) ──

export const reenviarConfirmacao = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(200).json({ message: GENERIC_RESEND_MESSAGE });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Só reenvia para contas de credenciais ainda não confirmadas — conta
    // já verificada (inclusive Google) ou inexistente recebe a mesma
    // resposta genérica, sem revelar o estado real da conta.
    if (user && user.password && !user.emailVerified) {
      const { token, tokenHash } = generateVerificationToken();

      await prisma.$transaction([
        // O reenvio não estende o prazo de exclusão: a nova janela continua
        // ancorada em User.createdAt, não no momento do reenvio.
        prisma.verificationToken.deleteMany({ where: { userId: user.id } }),
        prisma.verificationToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: verificationExpiresAt(user.createdAt),
          },
        }),
      ]);

      sendVerificationEmail({ to: user.email, token }).catch(() => {});
    }

    return res.status(200).json({ message: GENERIC_RESEND_MESSAGE });
  } catch (error) {
    console.error('Erro ao reenviar confirmação:', error.message);
    return res.status(200).json({ message: GENERIC_RESEND_MESSAGE });
  }
};

// Handler do rate limiter (1/min e 5/hora por e-mail) — mesma resposta
// genérica, silenciosamente, sem gerar token nem enviar e-mail.
export const reenviarConfirmacaoRateLimited = (req, res) => {
  res.status(200).json({ message: GENERIC_RESEND_MESSAGE });
};
