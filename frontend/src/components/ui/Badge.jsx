import React from 'react';

const VARIANTS = {
  success: 'bg-success-wash text-success',
  error:   'bg-error-wash text-error',
  alert:   'bg-alert-wash text-alert',
  info:    'bg-brand-wash text-brand-deep',
  neutral: 'bg-surface text-muted border border-line',
};

/**
 * Selo/badge de status do sistema de design (Fase 1).
 */
const Badge = ({ variant = 'neutral', className = '', children, ...rest }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${VARIANTS[variant]} ${className}`}
    {...rest}
  >
    {children}
  </span>
);

export default Badge;
