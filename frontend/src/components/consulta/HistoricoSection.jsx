import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { truncate } from '../../utils/consultaFormat';
import HistoricoDetalheModal from './HistoricoDetalheModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const HistoricoSection = ({ id, tipo }) => {
  const { token } = useAuth();
  const [showHistory, setShowHistory]     = useState(false);
  const [historico, setHistorico]         = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoricoItem, setSelectedHistoricoItem] = useState(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/historico-completo?tipo=${tipo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistorico(await res.json());
    } catch {}
    setLoadingHistory(false);
  };

  return (
    <div className="border-t border-line pt-4">
      <button
        onClick={() => {
          const next = !showHistory;
          setShowHistory(next);
          if (next && historico.length === 0) loadHistory();
        }}
        className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand-deep transition w-full text-left"
      >
        {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Histórico do paciente
        {historico.length > 0 && (
          <span className="text-xs text-muted font-normal ml-1">({historico.length} registros)</span>
        )}
      </button>

      {showHistory && (
        <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
          {loadingHistory ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted text-center py-2">Nenhum histórico encontrado.</p>
          ) : (
            historico.map((h) => {
              const isCanceled = String(h.status).toLowerCase().includes('cancel');
              return (
                <div key={h.id} className="bg-surface rounded-xl p-3 text-xs space-y-2">
                  {/* Linha 1: badges + data */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${
                      h.tipo === 'urgente'  ? 'bg-error-wash text-error' :
                      h.tipo === 'agendada' ? 'bg-brand-wash text-brand-deep' :
                                              'bg-line text-muted'
                    }`}>
                      {h.tipo === 'urgente' ? 'Urgente' : h.tipo === 'agendada' ? 'Agendada' : 'Consulta'}
                    </span>
                    <span className="text-muted">
                      {new Date(h.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    <span className={`font-medium ${isCanceled ? 'text-error' : 'text-success'}`}>
                      {isCanceled ? 'Cancelado' : 'Concluído'}
                    </span>
                  </div>

                  {/* Farmacêutico */}
                  {h.farmaceuticoNome && (
                    <p className="text-muted">
                      Farmacêutico(a): <span className="font-semibold text-ink">{h.farmaceuticoNome}</span>
                    </p>
                  )}

                  {/* Trecho das observações */}
                  {h.observacoes && (
                    <p className="text-muted italic leading-snug">
                      "{truncate(h.observacoes, 80)}"
                    </p>
                  )}
                  {!h.observacoes && !h.motivo && (
                    <p className="text-muted italic">Sem registros clínicos.</p>
                  )}

                  {/* Botão ver completo */}
                  <button
                    onClick={() => setSelectedHistoricoItem(h)}
                    className="w-full bg-canvas text-brand-deep border border-brand/40 rounded-lg py-1.5 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    Ver atendimento completo
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedHistoricoItem && (
        <HistoricoDetalheModal
          item={selectedHistoricoItem}
          onClose={() => setSelectedHistoricoItem(null)}
        />
      )}
    </div>
  );
};

export default HistoricoSection;
