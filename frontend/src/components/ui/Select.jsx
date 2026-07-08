import React from 'react';

let idCounter = 0;
const nextId = () => `ds-select-${++idCounter}`;

/**
 * Select base do sistema de design (Fase 1). Altura mínima de 44px.
 */
const Select = ({ label, error, id, className = '', children, ...rest }) => {
  const selectId = id || nextId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-muted">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={`h-11 rounded-xl border px-3.5 text-sm text-ink bg-canvas outline-none transition
          focus:ring-2 focus:ring-brand-wash focus:border-brand
          ${error ? 'border-error' : 'border-line'} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-error font-medium">{error}</p>}
    </div>
  );
};

export default Select;
