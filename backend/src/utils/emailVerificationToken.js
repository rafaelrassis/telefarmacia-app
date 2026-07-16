import crypto from 'crypto';

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const hashVerificationToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// O token em claro só existe em memória e no e-mail enviado ao usuário —
// nunca é persistido (só o hash vai para o banco, ver VerificationToken.tokenHash).
export const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashVerificationToken(token) };
};

// A janela de confirmação é sempre ancorada em User.createdAt, nunca em
// "agora" — um reenvio não pode estender o prazo de 24h que o job de
// exclusão automática usa, senão o link continuaria válido além do prazo em
// que a conta já teria sido apagada.
export const verificationExpiresAt = (userCreatedAt) =>
  new Date(userCreatedAt.getTime() + VERIFICATION_TOKEN_TTL_MS);
