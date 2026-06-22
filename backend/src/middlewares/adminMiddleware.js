export const adminMiddleware = (req, res, next) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!req.user || !adminEmails.includes(req.user.email)) {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }

  next();
};
