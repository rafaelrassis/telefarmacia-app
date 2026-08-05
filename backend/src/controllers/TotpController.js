import { authenticator } from 'otplib';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { encryptSecret, decryptSecret } from '../utils/totpEncryption.js';
import { generateBackupCodes } from '../utils/totpBackupCodes.js';
import { signToken, sanitizeUser, isAdminEmail } from './AuthController.js';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;
const ISSUER = 'FarmaConsulta';

// Tolerância de ±1 passo (30s) para compensar pequena diferença de relógio
// entre o servidor e o app autenticador do usuário.
authenticator.options = { window: 1 };

export const TOTP_TEMP_TOKEN_SCOPE = 'totp_pending';

// Token de curta duração emitido no login quando totpEnabled=true — não
// autentica a API normal (authMiddleware não aceita seu escopo), só serve
// para provar que a senha já foi validada ao chamar POST /totp/verify.
export const signTotpTempToken = (user) =>
  jwt.sign({ id: user.id, scope: TOTP_TEMP_TOKEN_SCOPE }, process.env.JWT_SECRET, { expiresIn: '5m' });

// ── Configuração (usuário autenticado, via Perfil) ──────────────────────────

// Gera um novo secret + backup codes e grava no banco com totpEnabled=false —
// só é ativado de fato em /totp/enable, depois de confirmar um código válido.
// Chamar de novo antes de ativar substitui o secret/códigos anteriores.
export const setupTotp = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const secret = authenticator.generateSecret();
    const backupCodes = generateBackupCodes();
    const hashedCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, BCRYPT_COST))
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: encryptSecret(secret),
        totpEnabled: false,
        totpBackupCodes: hashedCodes,
      },
    });

    const otpauthUrl = authenticator.keyuri(user.email, ISSUER, secret);

    // Backup codes em texto puro só existem nesta resposta — depois só o
    // hash bcrypt fica no banco (ver totpBackupCodes no schema).
    return res.status(200).json({ otpauthUrl, backupCodes });
  } catch (error) {
    console.error('Erro ao iniciar configuração de TOTP:', error.message);
    return res.status(500).json({ error: 'Erro ao iniciar configuração de autenticação em duas etapas.' });
  }
};

export const enableTotp = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Código é obrigatório.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.totpSecret) {
      return res.status(400).json({ error: 'Inicie a configuração antes de ativar.' });
    }

    const secret = decryptSecret(user.totpSecret);
    const valid = authenticator.verify({ token: String(code).trim(), secret });
    if (!valid) {
      return res.status(400).json({ error: 'Código inválido.' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });

    return res.status(200).json({ message: 'Autenticação em duas etapas ativada com sucesso.' });
  } catch (error) {
    console.error('Erro ao ativar TOTP:', error.message);
    return res.status(500).json({ error: 'Erro ao ativar autenticação em duas etapas.' });
  }
};

export const disableTotp = async (req, res) => {
  try {
    const { password, code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    if (!user.totpEnabled) {
      return res.status(400).json({ error: 'Autenticação em duas etapas não está ativa.' });
    }

    let authorized = false;
    if (password && user.password) {
      authorized = await bcrypt.compare(password, user.password);
    }
    if (!authorized && code && user.totpSecret) {
      const secret = decryptSecret(user.totpSecret);
      authorized = authenticator.verify({ token: String(code).trim(), secret });
    }
    if (!authorized) {
      return res.status(400).json({ error: 'Senha atual ou código de verificação inválido.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false, totpBackupCodes: [] },
    });

    return res.status(200).json({ message: 'Autenticação em duas etapas desativada.' });
  } catch (error) {
    console.error('Erro ao desativar TOTP:', error.message);
    return res.status(500).json({ error: 'Erro ao desativar autenticação em duas etapas.' });
  }
};

// ── Verificação no login (segunda etapa, sem sessão normal ainda) ──────────

export const verifyTotp = async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Dados incompletos.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Sessão de verificação expirada. Faça login novamente.' });
    }
    if (decoded.scope !== TOTP_TEMP_TOKEN_SCOPE) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { pharmacistProfile: true, pacienteProfile: true },
    });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(401).json({ error: 'Sessão de verificação inválida.' });
    }

    const trimmedCode = String(code).trim();
    const secret = decryptSecret(user.totpSecret);
    let valid = authenticator.verify({ token: trimmedCode, secret });

    // Se o código de 6 dígitos não bateu, tenta como backup code de uso
    // único — consumido (removido da lista) assim que usado com sucesso.
    let usedBackupCodeHash = null;
    if (!valid) {
      const candidate = trimmedCode.toUpperCase();
      for (const hashed of user.totpBackupCodes) {
        if (await bcrypt.compare(candidate, hashed)) {
          usedBackupCodeHash = hashed;
          valid = true;
          break;
        }
      }
    }

    if (!valid) {
      return res.status(401).json({ error: 'Código inválido.' });
    }

    if (usedBackupCodeHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { totpBackupCodes: user.totpBackupCodes.filter((hash) => hash !== usedBackupCodeHash) },
      });
    }

    return res.status(200).json({
      token: signToken(user),
      user: { ...sanitizeUser(user), isAdmin: isAdminEmail(user.email) },
      isNewUser: false,
    });
  } catch (error) {
    console.error('Erro ao verificar código TOTP:', error.message);
    return res.status(500).json({ error: 'Erro ao verificar código.' });
  }
};
