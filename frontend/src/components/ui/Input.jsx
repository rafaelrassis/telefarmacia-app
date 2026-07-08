import React from 'react';

let idCounter = 0;
const nextId = () => `ds-input-${++idCounter}`;

/**
 * Campo de texto base do sistema de design (Fase 1). Altura mínima de 44px.
 */
const Input = ({ label, error, id, className = '', ...rest }) => {
  const inputId = id || nextId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`h-11 rounded-xl border px-3.5 text-sm text-ink bg-canvas outline-none transition
          placeholder:text-muted
          focus:ring-2 focus:ring-brand-wash focus:border-brand
          ${error ? 'border-error' : 'border-line'} ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-error font-medium">{error}</p>}
    </div>
  );
};

export default Input;
