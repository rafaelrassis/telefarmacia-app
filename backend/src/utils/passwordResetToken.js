import crypto from 'crypto';

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// O token em claro só existe em memória e no e-mail enviado ao usuário —
// nunca é persistido (só o hash vai para o banco, ver PasswordReset.tokenHash).
export const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashResetToken(token) };
};
