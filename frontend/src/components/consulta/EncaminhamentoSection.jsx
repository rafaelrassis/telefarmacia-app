import React from 'react';

const EncaminhamentoSection = ({
  consulta, isAssigned, isVisualizacao,
  encaminhamentoPdfUrl, handleAbrirDocumento,
  showEncaminhForm, setShowEncaminhForm,
  encaminhEspecialidade, setEncaminhEspecialidade,
  encaminhResumo, setEncaminhResumo,
  handleGerarEncaminhamento, actionLoading,
}) => (
  <>
    {/* ── Encaminhamento ── */}
    {consulta?.status === 'concluido' && isAssigned && !isVisualizacao && (
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Documento de Encaminhamento</p>
          {encaminhamentoPdfUrl && (
            <button
              onClick={() => handleAbrirDocumento(encaminhamentoPdfUrl)}
              className="text-xs text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition"
            >
              📋 Ver encaminhamento
            </button>
          )}
        </div>
        {!showEncaminhForm ? (
          <button
            onClick={() => setShowEncaminhForm(true)}
            className="w-full px-4 py-2.5 text-sm font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
          >
            {encaminhamentoPdfUrl ? '↺ Re-gerar encaminhamento' : '📋 Gerar encaminhamento'}
          </button>
        ) : (
          <div className="space-y-3 bg-teal-50 border border-teal-200 rounded-xl p-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Especialidade / serviço de destino <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={encaminhEspecialidade}
                onChange={(e) => setEncaminhEspecialidade(e.target.value)}
                placeholder="Ex: Cardiologia, Endocrinologia, UBS..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Resumo clínico (opcional)</label>
              <textarea
                value={encaminhResumo}
                onChange={(e) => setEncaminhResumo(e.target.value)}
                placeholder="Motivo do encaminhamento, histórico relevante..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEncaminhForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGerarEncaminhamento}
                disabled={actionLoading === 'encaminh'}
                className="flex-1 px-4 py-2 text-sm font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition"
              >
                {actionLoading === 'encaminh' ? '⏳ Gerando...' : '📋 Gerar PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    )}

    {/* Visualizar encaminhamento (modo visualização / paciente) */}
    {isVisualizacao && encaminhamentoPdfUrl && (
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => handleAbrirDocumento(encaminhamentoPdfUrl)}
          className="flex items-center gap-2 text-sm font-bold text-teal-700 border border-teal-200 rounded-xl px-4 py-2.5 hover:bg-teal-50 transition w-full justify-center"
        >
          📋 Ver documento de encaminhamento
        </button>
      </div>
    )}
  </>
);

export default EncaminhamentoSection;
