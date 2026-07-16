import React from 'react';
import { PhoneOff } from 'lucide-react';

const SemContatoAction = ({
  isActive, isVisualizacao, actionLoading, showDevolverConfirm,
  showSemContatoConfirm, setShowSemContatoConfirm,
  semContatoLoading, handleSemContato,
}) => {
  if (isVisualizacao) return null;

  return (
    <>
      {/* Não consegui contato */}
      {isActive && !showSemContatoConfirm && !showDevolverConfirm && (
        <div className="flex">
          <button
            onClick={() => setShowSemContatoConfirm(true)}
            disabled={!!actionLoading}
            className="px-4 py-2 bg-canvas border border-error/30 text-error text-sm font-bold rounded-xl hover:bg-error-wash disabled:opacity-50 transition inline-flex items-center gap-1.5"
          >
            <PhoneOff className="w-4 h-4" />
            Não consegui contato
          </button>
        </div>
      )}
      {showSemContatoConfirm && (
        <div className="bg-error-wash border border-error/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-error">Confirmar: não conseguiu contato com o paciente?</p>
          <p className="text-xs text-error">
            A consulta será cancelada e o crédito devolvido integralmente ao paciente.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSemContatoConfirm(false)}
              className="flex-1 py-2 text-sm border border-line rounded-lg hover:bg-surface transition"
            >
              Voltar
            </button>
            <button
              onClick={handleSemContato}
              disabled={semContatoLoading}
              className={`flex-1 py-2 bg-error text-error-contrast border-0 rounded-lg text-sm font-bold transition-opacity ${
                semContatoLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              {semContatoLoading ? '...' : 'Sim, confirmar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SemContatoAction;
