import React from 'react';
import { ClipboardList } from 'lucide-react';
import TemplatePicker from '../TemplatePicker';

const MotivoObservacoesForm = ({
  motivo, setMotivo,
  observacoes, setObservacoes, obsError, setObsError,
  isEncerrada, isVisualizacao, podeEditar, canConcluir,
  consulta, triagem,
  showTemplatePicker, setShowTemplatePicker,
}) => {
  const motivoDisabled = !podeEditar && !isEncerrada && !isVisualizacao;
  return (
  <div className="space-y-3">
    <div>
      <label htmlFor="motivo-consulta" className="block text-xs font-semibold text-muted mb-1">
        Motivo / Queixa principal
      </label>
      <textarea
        id="motivo-consulta"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        readOnly={isEncerrada || isVisualizacao || !podeEditar}
        title={motivoDisabled ? 'Inicie o atendimento para editar' : undefined}
        placeholder="Descreva o motivo da consulta ou queixa do paciente..."
        rows={3}
        className={`w-full border border-line rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-brand outline-none ${motivoDisabled ? 'bg-surface' : 'bg-canvas'}`}
      />
    </div>
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="observacoes-consulta" className="text-xs font-semibold text-muted">
          Observações do atendimento{canConcluir && <span className="text-error ml-0.5">*</span>}
        </label>
        {podeEditar && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplatePicker((v) => !v)}
              className="text-xs text-brand-deep hover:text-brand font-semibold border border-brand/30 rounded-lg px-2 py-1 hover:bg-brand-wash transition inline-flex items-center gap-1"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Usar template
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
        id="observacoes-consulta"
        value={observacoes}
        onChange={(e) => { setObservacoes(e.target.value); if (obsError) setObsError(false); }}
        readOnly={isEncerrada || isVisualizacao || !podeEditar}
        title={motivoDisabled ? 'Inicie o atendimento para editar' : undefined}
        placeholder="Orientações, recomendações ou observações clínicas..."
        rows={4}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 outline-none transition ${
          obsError
            ? 'border-error focus:ring-error/30 bg-error-wash'
            : `border-line focus:ring-brand ${motivoDisabled ? 'bg-surface' : 'bg-canvas'}`
        }`}
      />
      {obsError && (
        <p className="text-xs text-error mt-1 font-medium">
          Preencha as observações antes de concluir.
        </p>
      )}
    </div>
  </div>
  );
};

export default MotivoObservacoesForm;
