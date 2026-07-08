import React from 'react';
import TemplatePicker from '../TemplatePicker';

const MotivoObservacoesForm = ({
  motivo, setMotivo,
  observacoes, setObservacoes, obsError, setObsError,
  isEncerrada, isVisualizacao, podeEditar, canConcluir,
  consulta, triagem,
  showTemplatePicker, setShowTemplatePicker,
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        Motivo / Queixa principal
      </label>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        readOnly={isEncerrada || isVisualizacao || !podeEditar}
        title={!podeEditar && !isEncerrada && !isVisualizacao ? 'Inicie o atendimento para editar' : undefined}
        placeholder="Descreva o motivo da consulta ou queixa do paciente..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-violet-400 outline-none"
        style={{ background: (!podeEditar && !isEncerrada && !isVisualizacao) ? '#f3f4f6' : undefined }}
      />
    </div>
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-gray-600">
          Observações do atendimento{canConcluir && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {podeEditar && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplatePicker((v) => !v)}
              className="text-xs text-violet-600 hover:text-violet-800 font-semibold border border-violet-200 rounded-lg px-2 py-1 hover:bg-violet-50 transition"
            >
              📋 Usar template
            </button>
            {showTemplatePicker && (
              <TemplatePicker
                pacienteNome={consulta?.pacienteNome}
                triagem={triagem}
                onInsert={(text) => {
                  setObservacoes((prev) => prev ? `${prev}\n\n${text}` : text);
                  if (obsError) setObsError(false);
                  setShowTemplatePicker(false);
                }}
                onClose={() => setShowTemplatePicker(false)}
              />
            )}
          </div>
        )}
      </div>
      <textarea
        value={observacoes}
        onChange={(e) => { setObservacoes(e.target.value); if (obsError) setObsError(false); }}
        readOnly={isEncerrada || isVisualizacao || !podeEditar}
        title={!podeEditar && !isEncerrada && !isVisualizacao ? 'Inicie o atendimento para editar' : undefined}
        placeholder="Orientações, recomendações ou observações clínicas..."
        rows={4}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 outline-none transition ${
          obsError
            ? 'border-red-400 focus:ring-red-300 bg-red-50'
            : 'border-gray-200 focus:ring-violet-400'
        }`}
        style={{ background: (!podeEditar && !isEncerrada && !isVisualizacao && !obsError) ? '#f3f4f6' : undefined }}
      />
      {obsError && (
        <p className="text-xs text-red-600 mt-1 font-medium">
          Preencha as observações antes de concluir.
        </p>
      )}
    </div>
  </div>
);

export default MotivoObservacoesForm;
