// Logger estruturado (JSON por linha) com níveis e uma trava de redação para
// dados sensíveis. Não substitui os `console.*` já espalhados pelo repo —
// serve como padrão para o middleware de requisição e para pontos de erro
// não tratado; novos pontos de log podem adotar o mesmo padrão aos poucos.

const SENSITIVE_KEYS = new Set([
  'senha', 'password', 'token', 'authorization',
  'dados_saude', 'dadossaude',
]);

export function redact(value, depth = 0) {
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(val, depth + 1);
  }
  return out;
}

function write(level, message, meta) {
  const entry = { level, message, time: new Date().toISOString(), ...redact(meta) };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info:  (message, meta = {}) => write('info', message, meta),
  warn:  (message, meta = {}) => write('warn', message, meta),
  error: (message, meta = {}) => write('error', message, meta),
};
