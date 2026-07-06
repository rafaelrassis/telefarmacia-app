import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CACHE_TTL_MS = 30_000;
let cache = { emails: null, expiresAt: 0 };

function getEnvEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function getAdminEmails() {
  const now = Date.now();
  if (cache.emails && now < cache.expiresAt) return cache.emails;

  let dbEmails = [];
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: 'admin_emails' } });
    if (row?.value) dbEmails = JSON.parse(row.value).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  } catch (_) {}

  const emails = [...new Set([...getEnvEmails(), ...dbEmails])];
  cache = { emails, expiresAt: now + CACHE_TTL_MS };
  return emails;
}

export const invalidateAdminEmailsCache = () => {
  cache = { emails: null, expiresAt: 0 };
};

export const adminMiddleware = async (req, res, next) => {
  const emails = await getAdminEmails();
  if (!req.user || !emails.includes((req.user.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }

  next();
};
