import React from 'react';

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
            className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-50 transition"
          >
            📵 Não consegui contato
          </button>
        </div>
      )}
      {showSemContatoConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-800">Confirmar: não conseguiu contato com o paciente?</p>
          <p className="text-xs text-red-600">
            A consulta será cancelada e o crédito devolvido integralmente ao paciente.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSemContatoConfirm(false)}
              className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Voltar
            </button>
            <button
              onClick={handleSemContato}
              disabled={semContatoLoading}
              style={{
                flex: 1, padding: '8px 0', background: '#dc2626', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                cursor: semContatoLoading ? 'not-allowed' : 'pointer',
                opacity: semContatoLoading ? 0.5 : 1,
              }}
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
