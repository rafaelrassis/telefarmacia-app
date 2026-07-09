// Precisa ser importado antes de qualquer outro módulo da aplicação (ver
// server.js) para que a instrumentação automática do Sentry funcione.
// Sem SENTRY_DSN configurado, é um no-op — não tenta conectar em lugar nenhum.
import * as Sentry from '@sentry/node';

export const sentryEnabled = Boolean(process.env.SENTRY_DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Só rastreamento de erros — sem tracing de performance por padrão.
    tracesSampleRate: 0,
  });
}
