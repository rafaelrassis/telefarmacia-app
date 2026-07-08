import React from 'react';

/**
 * Estado vazio do sistema de design (Fase 1) — ícone/emoji + título +
 * descrição, com espaço opcional para uma ação (ex.: botão).
 */
const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-1.5">
    {icon && <span className="text-3xl mb-1.5" aria-hidden="true">{icon}</span>}
    {title && <p className="text-sm font-semibold text-ink">{title}</p>}
    {description && <p className="text-xs text-muted max-w-xs">{description}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export default EmptyState;
