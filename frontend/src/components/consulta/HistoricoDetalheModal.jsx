import React from 'react';
import { Zap, CalendarClock, Paperclip, Pill, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { abrirDocumentoAutenticado } from '../../utils/abrirDocumentoAutenticado';
import TriagemDisplay from './TriagemDisplay';
import FinalizacaoSection from './FinalizacaoSection';
import Modal from '../ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const HistoricoDetalheModal = ({ item, onClose }) => {
  const { token } = useAuth();
  if (!item) return null;

  const dataFmt = new Date(item.dataHora).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const TipoIcon = item.tipo === 'urgente' ? Zap : CalendarClock;
  const isConcluido = item.status === 'concluido';

  return (
    <Modal
      title="Atendimento anterior"
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-semibold border border-line rounded-xl hover:bg-surface transition text-ink"
        >
          Fechar
        </button>
      }
    >
      <div className="px-6 py-4 space-y-4">

        {/* Meta */}
        <div className="bg-surface rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-line text-muted inline-flex items-center gap-1">
              <TipoIcon className="w-3 h-3" />
              {item.tipo === 'urgente' ? 'Urgente' : 'Agendada'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isConcluido ? 'bg-teal-100 text-teal-700' : 'bg-error-wash text-error'
            }`}>
              {isConcluido ? 'Concluído' : 'Cancelado'}
            </span>
          </div>
          <p className="text-sm text-muted">{dataFmt}</p>
          {item.farmaceuticoNome && (
            <p className="text-xs text-muted">
              Farmacêutico(a): <span className="font-semibold text-ink">{item.farmaceuticoNome}</span>
            </p>
          )}
        </div>

        {/* Triagem */}
        {item.triagem && (
          <div>
            <p className="text-xs font-semibold text-muted mb-1.5">Triagem / Sinais e sintomas</p>
            <div className="bg-surface rounded-xl px-4 py-3">
              <TriagemDisplay triagem={item.triagem} solicitanteNome={null} />
              {item.anexoReceitaUrl && (
                <button
                  onClick={async () => {
                    try { await abrirDocumentoAutenticado(`${API_URL}${item.anexoReceitaUrl}`, token); }
                    catch { /* falha silenciosa — usuário pode tentar novamente */ }
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-deep border border-brand/30 rounded-lg px-3 py-1.5 hover:bg-brand-wash transition"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Ver anexo da receita
                </button>
              )}
            </div>
          </div>
        )}

        {/* Motivo */}
        {item.motivo && (
          <div>
            <p className="text-xs font-semibold text-muted mb-1.5">Motivo / Queixa principal</p>
            <p className="text-sm text-ink bg-surface rounded-xl px-4 py-3 leading-relaxed">{item.motivo}</p>
          </div>
        )}

        {/* Observações */}
        {item.observacoes && (
          <div>
            <p className="text-xs font-semibold text-muted mb-1.5">Observações do atendimento</p>
            <p className="text-sm text-ink bg-surface rounded-xl px-4 py-3 leading-relaxed">{item.observacoes}</p>
          </div>
        )}

        {!item.triagem && !item.motivo && !item.observacoes && (
          <p className="text-sm text-muted italic text-center py-2">Sem registros clínicos para este atendimento.</p>
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
            <p className="text-xs font-semibold text-muted mb-1.5 inline-flex items-center gap-1">
              <Pill className="w-3.5 h-3.5" />
              Receita farmacêutica
            </p>
            <div className="space-y-2">
              {item.receita.map((med, i) => (
                <div key={i} className="bg-surface rounded-xl px-4 py-3 text-xs space-y-0.5">
                  <p className="font-semibold text-ink text-sm">
                    {i + 1}. {med.medicamento}{med.dosagem ? `  ${med.dosagem}` : ''}
                  </p>
                  {med.posologia && <p className="text-muted">Posologia: {med.posologia}</p>}
                  {med.duracao   && <p className="text-muted">Duração: {med.duracao}</p>}
                </div>
              ))}
            </div>

            {item.receitaPdfUrl && (
              <button
                onClick={async () => {
                  try { await abrirDocumentoAutenticado(`${API_URL}${item.receitaPdfUrl}`, token); }
                  catch { /* falha silenciosa — usuário pode tentar novamente */ }
                }}
                className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-brand-deep border border-brand/30 rounded-xl hover:bg-brand-wash transition"
              >
                <FileText className="w-4 h-4" />
                Baixar receita em PDF
              </button>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
};

export default HistoricoDetalheModal;
