import React from 'react';

const VARIANTS = {
  primary:   'bg-brand text-white hover:bg-brand-deep disabled:bg-line disabled:text-muted',
  secondary: 'bg-canvas text-brand-deep border border-brand hover:bg-brand-wash disabled:border-line disabled:text-muted disabled:bg-canvas',
  ghost:     'bg-transparent text-brand-deep hover:bg-brand-wash disabled:text-muted',
  danger:    'bg-error text-white hover:opacity-90 disabled:bg-line disabled:text-muted',
};

const SIZES = {
  md: 'h-11 px-5 text-sm',
  sm: 'h-9 px-4 text-xs',
};

/**
 * Botão base do sistema de design (Fase 1 — ainda não adotado por nenhuma
 * tela existente). Alvo de toque mínimo de 44px (h-11) na variante padrão.
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
      disabled:cursor-not-allowed
      ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export default Button;
