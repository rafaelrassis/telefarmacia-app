import React from 'react';
import { TriangleAlert } from 'lucide-react';
import Modal from '../ui/Modal';

// Diálogo de confirmação compartilhado pelas ações destrutivas do painel admin
// (suspender / inativar / descadastrar / excluir paciente) — Modal do design
// system com o padrão visual botão error.
const ConfirmPowerAction = ({ title, name, message, alertText, confirmLabel, confirmingLabel, loading, onCancel, onConfirm }) => (
  <Modal
    title={title}
    onClose={onCancel}
    maxWidth="max-w-sm"
    footer={(
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-sm font-medium border border-line rounded-xl hover:bg-surface transition text-ink"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-bold bg-error text-white rounded-xl hover:bg-error/90 disabled:opacity-60 transition"
        >
          {loading ? confirmingLabel : confirmLabel}
        </button>
      </div>
    )}
  >
    <div className="px-6 pt-4 pb-2">
      <p className="text-sm text-ink mb-3">
        <strong>{name}</strong> {message}
      </p>
      {alertText && (
        <div className="flex items-start gap-1.5 bg-alert-wash border border-alert/30 rounded-lg px-3 py-2">
          <TriangleAlert className="w-3.5 h-3.5 text-alert shrink-0 mt-0.5" />
          <p className="text-xs text-alert font-semibold leading-snug m-0">{alertText}</p>
        </div>
      )}
    </div>
  </Modal>
);

export default ConfirmPowerAction;
