import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { validateNewPassword } from '../utils/passwordValidation.js';
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from '../utils/passwordResetToken.js';
import { sendPasswordChangedEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { logAction } from '../utils/logAction.js';
import { signToken, sanitizeUser, isAdminEmail } from './AuthController.js';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

const GENERIC_RESET_MESSAGE = 'Se este e-mail estiver cadastrado, enviamos um link de redefinição.';

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.socket?.remoteAddress
  || null;

// ── Fluxo 1 & 3 — Alterar senha / Definir senha (usuário logado) ───────────
// Mesmo endpoint para os dois fluxos: se o usuário não tem passwordHash
// (conta só-Google), a senha atual não é exigida (Fluxo 3 — "Definir senha").

export const alterarSenha = async (req, res) => {
  const userId = req.user.id;
  const { senhaAtual, novaSenha, confirmarSenha } = req.body;

  try {
    if (!novaSenha || novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: 'As senhas não coincidem.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const hadPassword = Boolean(user.password);

    if (hadPassword) {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória.' });
      }
      const valid = await bcrypt.compare(senhaAtual, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Senha atual incorreta.' });
      }
    }

    const validationError = validateNewPassword(novaSenha, {
      email: user.email,
      senhaAtualPlain: hadPassword ? senhaAtual : undefined,
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const passwordHash = await bcrypt.hash(novaSenha, BCRYPT_COST);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      // passwordChangedAt derruba (via authMiddleware) qualquer JWT emitido
      // antes deste instante — inclusive os de outras sessões/dispositivos.
      // O token retornado nesta resposta é emitido DEPOIS, então continua válido.
      data: { password: passwordHash, passwordChangedAt: new Date() },
    });

    await logAction(prisma, {
      usuarioId: userId,
      role: user.role,
      acao: hadPassword ? 'PASSWORD_CHANGED' : 'PASSWORD_SET',
      detalhes: { ip: getIp(req) },
    });

    sendPasswordChangedEmail({ to: user.email }).catch(() => {});

    return res.status(200).json({
      message: hadPassword ? 'Senha alterada com sucesso.' : 'Senha definida com sucesso.',
      user: { ...sanitizeUser(updatedUser), isAdmin: isAdminEmail(updatedUser.email) },
      token: signToken(updatedUser),
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error.message);
    return res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
};

// ── Fluxo 2 — Esqueci minha senha (usuário deslogado) ───────────────────────

export const esqueciSenha = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim();
    if (!email) {
      return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const { token, tokenHash } = generateResetToken();

      await prisma.$transaction([
        // Invalida tokens anteriores ainda ativos antes de emitir um novo.
        prisma.passwordReset.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
        prisma.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        }),
      ]);

      sendPasswordResetEmail({ to: user.email, token, hasPassword: Boolean(user.password) }).catch(() => {});
    }

    // Sempre a mesma resposta — não revela se o e-mail existe.
    return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    console.error('Erro em esqueci-senha:', error.message);
    // Mesmo em erro interno, não vazamos detalhes sobre existência do e-mail.
    return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
  }
};

// Handler do rate limiter (por e-mail e por IP) — a mesma resposta genérica,
// silenciosamente, sem gerar token nem enviar e-mail.
export const esqueciSenhaRateLimited = (req, res) => {
  res.status(200).json({ message: GENERIC_RESET_MESSAGE });
};

// ── Fluxo 2 — Redefinir senha (via token do e-mail) ────────────────────────

export const redefinirSenha = async (req, res) => {
  try {
    const { token, novaSenha, confirmarSenha } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
    if (!novaSenha || novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: 'As senhas não coincidem.' });
    }

    const tokenHash = hashResetToken(token);
    const resetRecord = await prisma.passwordReset.findUnique({ where: { tokenHash } });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const user = await prisma.user.findUnique({ where: { id: resetRecord.userId } });
    if (!user) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const validationError = validateNewPassword(novaSenha, { email: user.email });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const passwordHash = await bcrypt.hash(novaSenha, BCRYPT_COST);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash, passwordChangedAt: new Date() },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAction(prisma, {
      usuarioId: user.id,
      role: user.role,
      acao: 'PASSWORD_RESET',
      detalhes: { ip: getIp(req) },
    });

    sendPasswordChangedEmail({ to: user.email }).catch(() => {});

    return res.status(200).json({ message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error.message);
    return res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
};
