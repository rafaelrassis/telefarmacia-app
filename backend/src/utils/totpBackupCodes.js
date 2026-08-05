import crypto from 'crypto';

const BACKUP_CODE_COUNT = 10;

// 4 bytes -> 8 hex chars -> "XXXX-XXXX", fácil de digitar e de ler em voz alta.
const generateBackupCode = () =>
  crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');

export const generateBackupCodes = (count = BACKUP_CODE_COUNT) =>
  Array.from({ length: count }, generateBackupCode);
