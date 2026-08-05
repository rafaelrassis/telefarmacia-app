import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// ENCRYPTION_KEY pode ter qualquer tamanho — reduzimos sempre a 32 bytes via
// SHA-256 para caber na exigência do AES-256, sem forçar o operador a gerar
// uma chave num formato específico.
const getKey = () => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY não configurada.');
  return crypto.createHash('sha256').update(raw).digest();
};

// Formato persistido: iv:authTag:cipherText, tudo em hex — o secret TOTP
// nunca é gravado em texto puro (ver spec-totp-2fa-opcional.md).
export const encryptSecret = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
};

export const decryptSecret = (payload) => {
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};
