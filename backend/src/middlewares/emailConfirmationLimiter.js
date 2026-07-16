import rateLimit from 'express-rate-limit';
import { reenviarConfirmacaoRateLimited } from '../controllers/EmailConfirmationController.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const keyByEmail = (req) => (req.body?.email || '').trim().toLowerCase() || 'sem-email';

// Limite de reenvio de confirmação: 1 por minuto e 5 por hora, por e-mail
// (camadas independentes, aplicadas em série na rota). Acima do limite, o
// handler customizado responde a mesma mensagem genérica com 200 — nunca um
// 429, para não revelar que o limite foi atingido (mesmo padrão de
// passwordResetLimiter.js).
export const reenviarConfirmacaoPorMinutoLimiter = rateLimit({
  windowMs: MINUTE_MS,
  max: 1,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: keyByEmail,
  handler: reenviarConfirmacaoRateLimited,
});

export const reenviarConfirmacaoPorHoraLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: 5,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: keyByEmail,
  handler: reenviarConfirmacaoRateLimited,
});
