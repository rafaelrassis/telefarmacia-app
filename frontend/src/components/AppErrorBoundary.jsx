import React from 'react';
import { Sentry } from '../monitoring/sentry';
import EmptyState from './ui/EmptyState';
import Button from './ui/Button';

const Fallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
    <EmptyState
      icon="⚠️"
      title="Algo deu errado"
      description="Ocorreu um erro inesperado. Tente recarregar a página."
      action={<Button onClick={() => window.location.reload()}>Recarregar</Button>}
    />
  </div>
);

const AppErrorBoundary = ({ children }) => (
  <Sentry.ErrorBoundary fallback={<Fallback />}>
    {children}
  </Sentry.ErrorBoundary>
);

export default AppErrorBoundary;
