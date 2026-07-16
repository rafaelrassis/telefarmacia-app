import React from 'react';
import { Pill, X, FileText, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';

const ReceitaSection = ({
  receitaEditable, receitaReadonly,
  receita, addMed, removeMed, updateMed,
  podeEditar, isAssigned, isVisualizacao,
  receitaPdfUrl, handleAbrirDocumento, handleGerarPdf, actionLoading,
}) => {
  if (!receitaEditable && !receitaReadonly) return null;

  return (
    <div className="border-t border-line pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink inline-flex items-center gap-1.5">
          <Pill className="w-4 h-4" />
          Receita Farmacêutica
        </h3>
      </div>

      {receitaEditable ? (
        <div className="space-y-2">
          {receita.map((med, i) => (
            <div key={i} className="bg-surface rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Medicamento {i + 1}</span>
                <button
                  onClick={() => removeMed(i)}
                  aria-label="Remover medicamento"
                  className="text-error/60 hover:text-error w-6 h-6 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Nome do medicamento"
                value={med.medicamento}
                onChange={(e) => updateMed(i, 'medicamento', e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Dosagem (ex: 500mg)"
                  value={med.dosagem}
                  onChange={(e) => updateMed(i, 'dosagem', e.target.value)}
                  className="border border-line rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none"
                />
                <input
                  type="text"
                  placeholder="Duração (ex: 7 dias)"
                  value={med.duracao}
                  onChange={(e) => updateMed(i, 'duracao', e.target.value)}
                  className="border border-line rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="Posologia (ex: 1 comprimido de 8 em 8 horas)"
                value={med.posologia}
                onChange={(e) => updateMed(i, 'posologia', e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none"
              />
            </div>
          ))}
          <button
            onClick={addMed}
            disabled={!podeEditar}
            title={!podeEditar ? 'Inicie o atendimento para editar' : undefined}
            className={`w-full py-2.5 text-sm font-semibold rounded-xl border-2 border-dashed bg-canvas transition ${
              podeEditar ? 'text-brand-deep border-brand/40 cursor-pointer' : 'text-muted border-line cursor-not-allowed opacity-50'
            }`}
          >
            + Adicionar medicamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {receita.length === 0 ? (
            <p className="text-sm text-muted italic">Nenhum medicamento prescrito.</p>
          ) : (
            <div className="space-y-2">
              {receita.map((med, i) => (
                <div key={i} className="bg-surface rounded-xl p-3 text-xs space-y-0.5">
                  <p className="font-semibold text-ink text-sm">
                    {i + 1}. {med.medicamento}{med.dosagem ? `  ${med.dosagem}` : ''}
                  </p>
                  {med.posologia && <p className="text-muted">Posologia: {med.posologia}</p>}
                  {med.duracao   && <p className="text-muted">Duração: {med.duracao}</p>}
                </div>
              ))}
            </div>
          )}
          {receita.length > 0 && !receitaPdfUrl && isAssigned && !isVisualizacao && (
            <p className="text-xs text-alert bg-alert-wash border border-alert/30 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              PDF da receita pendente — a geração automática não funcionou. Gere manualmente abaixo.
            </p>
          )}
          {(isAssigned || (isVisualizacao && receitaPdfUrl)) && (
            <div className="flex gap-2 pt-1">
              {receitaPdfUrl && (
                <button
                  onClick={() => handleAbrirDocumento(receitaPdfUrl)}
                  className="flex-1 px-4 py-2.5 text-center text-sm font-bold text-brand-deep border border-brand/30 rounded-xl hover:bg-brand-wash transition inline-flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  Ver PDF
                </button>
              )}
              {isAssigned && !isVisualizacao && (
                <button
                  onClick={handleGerarPdf}
                  disabled={actionLoading === 'pdf'}
                  className="flex-1 px-4 py-2.5 text-sm font-bold bg-brand text-brand-contrast rounded-xl hover:bg-brand-deep disabled:opacity-50 transition inline-flex items-center justify-center gap-1.5"
                >
                  {actionLoading === 'pdf' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</>
                  ) : receitaPdfUrl ? (
                    <><RotateCcw className="w-4 h-4" />Re-gerar PDF</>
                  ) : (
                    <><FileText className="w-4 h-4" />Gerar PDF</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceitaSection;
