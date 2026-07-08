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
            className="px-4 py-2 bg-white border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-50 disabled:opacity-50 transition"
          >
            ↩ Devolver para fila
          </button>
        </div>
      )}

      {/* Confirmação de devolução */}
      {showDevolverConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">Devolver esta consulta para a fila?</p>
          <p className="text-xs text-amber-600">Outro farmacêutico poderá atendê-la.</p>
          <textarea
            value={motivoDevolver}
            onChange={(e) => setMotivoDevolver(e.target.value)}
            placeholder="Motivo da devolução (opcional)"
            rows={2}
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-amber-400 outline-none bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowDevolverConfirm(false); setMotivoDevolver(''); }}
              className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Voltar
            </button>
            <button
              onClick={handleDevolver}
              disabled={actionLoading === 'devolver'}
              className="flex-1 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
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
