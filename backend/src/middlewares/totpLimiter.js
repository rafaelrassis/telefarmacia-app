import rateLimit from 'express-rate-limit';

const TEN_MIN_MS = 10 * 60 * 1000;

const totpRateLimitedHandler = (req, res) => {
  res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
};

// Código de 6 dígitos é força-bruta viável sem limite (1 milhão de
// combinações) — um limiter por tempToken (a tentativa é sempre amarrada a
// um login específico) e outro por IP, aplicados em série na rota.
export const totpVerifyPorTokenLimiter = rateLimit({
  windowMs: TEN_MIN_MS,
  max: 8,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body?.tempToken || '').slice(0, 128) || 'sem-token',
  handler: totpRateLimitedHandler,
});

export const totpVerifyPorIpLimiter = rateLimit({
  windowMs: TEN_MIN_MS,
  max: 20,
  standardHeaders: false,
  legacyHeaders: false,
  handler: totpRateLimitedHandler,
});
