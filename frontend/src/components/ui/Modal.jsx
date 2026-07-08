import React, { useEffect } from 'react';

/**
 * Casca de modal do sistema de design (Fase 1). Fecha com Esc e clique no
 * fundo; título opcional já ligado via aria-labelledby para leitores de tela.
 */
const Modal = ({ title, onClose, maxWidth = 'max-w-md', children }) => {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const titleId = title ? 'ds-modal-title' : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative bg-canvas rounded-2xl shadow-md w-full ${maxWidth} max-h-[90vh] flex flex-col`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
            <h2 id={titleId} className="font-heading font-bold text-ink text-lg">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="text-muted hover:text-ink w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface transition text-xl
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
