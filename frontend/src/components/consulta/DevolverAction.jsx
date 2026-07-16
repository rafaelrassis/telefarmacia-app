import React from 'react';

const DevolverAction = ({
  canDevolver, isVisualizacao, actionLoading,
  showDevolverConfirm, setShowDevolverConfirm,
  motivoDevolver, setMotivoDevolver,
  handleDevolver,
}) => {
  if (isVisualizacao) return null;

  return (
    <>
      {/* Botão Devolver (ação secundária, fica inline) */}
      {canDevolver && !showDevolverConfirm && (
        <div className="flex">
          <button
            onClick={() => setShowDevolverConfirm(true)}
            disabled={!!actionLoading}
            className="px-4 py-2 bg-canvas border border-alert/30 text-alert text-sm font-bold rounded-xl hover:bg-alert-wash disabled:opacity-50 transition"
          >
            ↩ Devolver para fila
          </button>
        </div>
      )}

      {/* Confirmação de devolução */}
      {showDevolverConfirm && (
        <div className="bg-alert-wash border border-alert/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-alert">Devolver esta consulta para a fila?</p>
          <p className="text-xs text-alert">Outro farmacêutico poderá atendê-la.</p>
          <textarea
            value={motivoDevolver}
            onChange={(e) => setMotivoDevolver(e.target.value)}
            placeholder="Motivo da devolução (opcional)"
            rows={2}
            className="w-full border border-alert/30 rounded-lg px-3 py-2 text-sm text-ink resize-none focus:ring-2 focus:ring-alert outline-none bg-canvas"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowDevolverConfirm(false); setMotivoDevolver(''); }}
              className="flex-1 py-2 text-sm text-ink border border-line rounded-lg hover:bg-surface transition"
            >
              Voltar
            </button>
            <button
              onClick={handleDevolver}
              disabled={actionLoading === 'devolver'}
              className="flex-1 py-2 text-sm font-bold bg-alert text-alert-contrast rounded-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {actionLoading === 'devolver' ? '...' : 'Sim, devolver'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DevolverAction;
