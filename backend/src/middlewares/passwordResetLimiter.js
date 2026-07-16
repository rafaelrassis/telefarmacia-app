import rateLimit from 'express-rate-limit';
import { esqueciSenhaRateLimited } from '../controllers/PasswordController.js';

const HOUR_MS = 60 * 60 * 1000;

// Limite de 3 solicitações de reset por hora — um limiter por e-mail e outro
// por IP (aplicados em série na rota). Acima do limite, responde a mesma
// mensagem genérica do fluxo normal, sem gerar token nem enviar e-mail —
// nunca revela que o limite foi atingido.
export const esqueciSenhaPorEmailLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: 3,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body?.email || '').trim().toLowerCase() || 'sem-email',
  handler: esqueciSenhaRateLimited,
});

export const esqueciSenhaPorIpLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: 3,
  standardHeaders: false,
  legacyHeaders: false,
  handler: esqueciSenhaRateLimited,
});
