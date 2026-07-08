import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { abrirDocumentoAutenticado } from '../../utils/abrirDocumentoAutenticado';
import TriagemDisplay from './TriagemDisplay';
import FinalizacaoSection from './FinalizacaoSection';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const HistoricoDetalheModal = ({ item, onClose }) => {
  const { token } = useAuth();
  if (!item) return null;

  const dataFmt = new Date(item.dataHora).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const tipoBadge = item.tipo === 'urgente' ? '🔴 Urgente' : '📅 Agendada';
  const isConcluido = item.status === 'concluido';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-base">Atendimento anterior</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-xl"
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Meta */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                {tipoBadge}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isConcluido ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'
              }`}>
                {isConcluido ? 'Concluído' : 'Cancelado'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{dataFmt}</p>
            {item.farmaceuticoNome && (
              <p className="text-xs text-gray-500">
                Farmacêutico(a): <span className="font-semibold text-gray-700">{item.farmaceuticoNome}</span>
              </p>
            )}
          </div>

          {/* Triagem */}
          {item.triagem && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Triagem / Sinais e sintomas</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <TriagemDisplay triagem={item.triagem} solicitanteNome={null} />
              </div>
            </div>
          )}

          {/* Motivo */}
          {item.motivo && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Motivo / Queixa principal</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{item.motivo}</p>
            </div>
          )}

          {/* Observações */}
          {item.observacoes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Observações do atendimento</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{item.observacoes}</p>
            </div>
          )}

          {!item.triagem && !item.motivo && !item.observacoes && (
            <p className="text-sm text-gray-400 italic text-center py-2">Sem registros clínicos para este atendimento.</p>
          )}

          {/* Finalização */}
          {item.finalizacao && (
            <FinalizacaoSection readonly data={item.finalizacao}
              problemaAutolimitado={null} pacienteCompreendeu={null}
              contraindicacao={null} contraindicacaoDetalhe=""
              encaminhamentoMedico={null} encaminhamentoDetalhe=""
            />
          )}

          {/* Receita */}
          {Array.isArray(item.receita) && item.receita.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">💊 Receita farmacêutica</p>
              <div className="space-y-2">
                {item.receita.map((med, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 text-xs space-y-0.5">
                    <p className="font-semibold text-gray-800 text-sm">
                      {i + 1}. {med.medicamento}{med.dosagem ? `  ${med.dosagem}` : ''}
                    </p>
                    {med.posologia && <p className="text-gray-600">Posologia: {med.posologia}</p>}
                    {med.duracao   && <p className="text-gray-600">Duração: {med.duracao}</p>}
                  </div>
                ))}
              </div>

              {item.receitaPdfUrl && (
                <button
                  onClick={async () => {
                    try { await abrirDocumentoAutenticado(`${API_URL}${item.receitaPdfUrl}`, token); }
                    catch { /* falha silenciosa — usuário pode tentar novamente */ }
                  }}
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-50 transition"
                >
                  📄 Baixar receita em PDF
                </button>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-700"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

export default HistoricoDetalheModal;
