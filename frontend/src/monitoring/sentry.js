import * as Sentry from '@sentry/react';

// Sem VITE_SENTRY_DSN configurado, initSentry() é um no-op — nenhuma
// tentativa de conexão é feita.
export const sentryEnabled = Boolean(import.meta.env.VITE_SENTRY_DSN);

export function initSentry() {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  });
}

export { Sentry };
