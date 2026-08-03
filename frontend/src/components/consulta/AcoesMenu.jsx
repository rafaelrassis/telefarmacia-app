import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Undo2, PhoneOff, X, Save } from 'lucide-react';

const AcoesMenu = ({
  canDevolver, canSemContato, canCancelar, canSalvarRascunho,
  actionLoading, podeEditar, rascunhoMsg,
  onDevolver, onSemContato, onCancelar, onSalvarRascunho,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const hasAnyAction = canDevolver || canSemContato || canCancelar || canSalvarRascunho;
  if (!hasAnyAction) return null;

  const item = (onClick, icon, label, danger) => (
    <button
      onClick={() => { setOpen(false); onClick(); }}
      disabled={!!actionLoading}
      className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-left disabled:opacity-50 ${
        danger ? 'text-error' : 'text-ink'
      } hover:bg-surface transition`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative sm:hidden" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!actionLoading}
        className="px-4 py-2.5 bg-canvas border border-line text-ink text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        <MoreVertical className="w-4 h-4" />
        Ações
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-canvas border border-line rounded-xl shadow-2xl overflow-hidden z-10">
          {canDevolver && item(onDevolver, <Undo2 className="w-4 h-4 text-alert" />, 'Devolver para fila')}
          {canSemContato && item(onSemContato, <PhoneOff className="w-4 h-4 text-error" />, 'Não consegui contato', true)}
          {canSalvarRascunho && item(onSalvarRascunho, <Save className="w-4 h-4" />, podeEditar ? 'Salvar rascunho' : 'Salvar rascunho (inicie o atendimento)')}
          {canCancelar && item(onCancelar, <X className="w-4 h-4 text-error" />, 'Cancelar consulta', true)}
        </div>
      )}
      {rascunhoMsg && <p className="text-[11px] font-semibold text-success mt-1">{rascunhoMsg}</p>}
    </div>
  );
};

export default AcoesMenu;
