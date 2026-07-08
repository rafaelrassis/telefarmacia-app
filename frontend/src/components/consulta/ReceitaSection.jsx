import React from 'react';
import TemplatePicker from '../TemplatePicker';

const ReceitaSection = ({
  receitaEditable, receitaReadonly,
  receita, addMed, removeMed, updateMed,
  podeEditar, isAssigned, isVisualizacao,
  receitaPdfUrl, handleAbrirDocumento, handleGerarPdf, actionLoading,
  showTemplatePicker, setShowTemplatePicker,
  consulta, triagem, setObservacoes,
}) => {
  if (!receitaEditable && !receitaReadonly) return null;

  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">💊 Receita Farmacêutica</h3>
        {receitaEditable && (
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
                  setShowTemplatePicker(false);
                }}
                onClose={() => setShowTemplatePicker(false)}
              />
            )}
          </div>
        )}
      </div>

      {receitaEditable ? (
        <div className="space-y-2">
          {receita.map((med, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Medicamento {i + 1}</span>
                <button
                  onClick={() => removeMed(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none w-6 h-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Nome do medicamento"
                value={med.medicamento}
                onChange={(e) => updateMed(i, 'medicamento', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Dosagem (ex: 500mg)"
                  value={med.dosagem}
                  onChange={(e) => updateMed(i, 'dosagem', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                />
                <input
                  type="text"
                  placeholder="Duração (ex: 7 dias)"
                  value={med.duracao}
                  onChange={(e) => updateMed(i, 'duracao', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="Posologia (ex: 1 comprimido de 8 em 8 horas)"
                value={med.posologia}
                onChange={(e) => updateMed(i, 'posologia', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
              />
            </div>
          ))}
          <button
            onClick={addMed}
            disabled={!podeEditar}
            title={!podeEditar ? 'Inicie o atendimento para editar' : undefined}
            style={{
              width: '100%',
              padding: '10px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: podeEditar ? '#7c3aed' : '#9ca3af',
              border: `2px dashed ${podeEditar ? '#ddd6fe' : '#e5e7eb'}`,
              borderRadius: '12px',
              background: 'white',
              cursor: podeEditar ? 'pointer' : 'not-allowed',
              opacity: podeEditar ? 1 : 0.5,
            }}
          >
            + Adicionar medicamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {receita.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nenhum medicamento prescrito.</p>
          ) : (
            <div className="space-y-2">
              {receita.map((med, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-0.5">
                  <p className="font-semibold text-gray-800 text-sm">
                    {i + 1}. {med.medicamento}{med.dosagem ? `  ${med.dosagem}` : ''}
                  </p>
                  {med.posologia && <p className="text-gray-600">Posologia: {med.posologia}</p>}
                  {med.duracao   && <p className="text-gray-600">Duração: {med.duracao}</p>}
                </div>
              ))}
            </div>
          )}
          {(isAssigned || (isVisualizacao && receitaPdfUrl)) && (
            <div className="flex gap-2 pt-1">
              {receitaPdfUrl && (
                <button
                  onClick={() => handleAbrirDocumento(receitaPdfUrl)}
                  className="flex-1 px-4 py-2.5 text-center text-sm font-bold text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-50 transition"
                >
                  📄 Ver PDF
                </button>
              )}
              {isAssigned && !isVisualizacao && (
                <button
                  onClick={handleGerarPdf}
                  disabled={actionLoading === 'pdf'}
                  className="flex-1 px-4 py-2.5 text-sm font-bold bg-violet-700 text-white rounded-xl hover:bg-violet-800 disabled:opacity-50 transition"
                >
                  {actionLoading === 'pdf'
                    ? '⏳ Gerando...'
                    : receitaPdfUrl ? '↺ Re-gerar PDF' : '📄 Gerar PDF'}
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
