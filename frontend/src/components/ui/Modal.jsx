import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Casca de modal do sistema de design (Fase 1, estendida na Fase 9C.1).
 * Fecha com Esc e clique no fundo (a menos que closeOnBackdrop=false, usado
 * por fluxos com confirmação destrutiva pendente); título opcional já ligado
 * via aria-labelledby; foco inicial no diálogo para leitores de tela e
 * navegação por teclado; footer opcional para ações fixas.
 */
const Modal = ({ title, onClose, maxWidth = 'max-w-md', footer, closeOnBackdrop = true, children }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape' && closeOnBackdrop) onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, closeOnBackdrop]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const titleId = title ? 'ds-modal-title' : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={closeOnBackdrop ? onClose : undefined} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative bg-canvas rounded-2xl shadow-md w-full ${maxWidth} max-h-[90vh] flex flex-col outline-none`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
            <h2 id={titleId} className="font-heading font-bold text-ink text-lg">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="text-muted hover:text-ink w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="border-t border-line px-6 py-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
