import React, { useState } from 'react';
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
    <div className="border-t border-gray-100 pt-4">
      <button
        onClick={() => {
          const next = !showHistory;
          setShowHistory(next);
          if (next && historico.length === 0) loadHistory();
        }}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-violet-700 transition w-full text-left"
      >
        <span className="text-xs">{showHistory ? '▲' : '▼'}</span>
        Histórico do paciente
        {historico.length > 0 && (
          <span className="text-xs text-gray-400 font-normal ml-1">({historico.length} registros)</span>
        )}
      </button>

      {showHistory && (
        <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
          {loadingHistory ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Nenhum histórico encontrado.</p>
          ) : (
            historico.map((h) => {
              const isCanceled = String(h.status).toLowerCase().includes('cancel');
              return (
                <div key={h.id} className="bg-gray-50 rounded-xl p-3 text-xs space-y-2">
                  {/* Linha 1: badges + data */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${
                      h.tipo === 'urgente'  ? 'bg-red-100 text-red-700' :
                      h.tipo === 'agendada' ? 'bg-violet-100 text-violet-700' :
                                              'bg-gray-200 text-gray-600'
                    }`}>
                      {h.tipo === 'urgente' ? 'Urgente' : h.tipo === 'agendada' ? 'Agendada' : 'Consulta'}
                    </span>
                    <span className="text-gray-400">
                      {new Date(h.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    <span className={`font-medium ${isCanceled ? 'text-red-500' : 'text-green-600'}`}>
                      {isCanceled ? 'Cancelado' : 'Concluído'}
                    </span>
                  </div>

                  {/* Farmacêutico */}
                  {h.farmaceuticoNome && (
                    <p className="text-gray-500">
                      Farmacêutico(a): <span className="font-semibold text-gray-700">{h.farmaceuticoNome}</span>
                    </p>
                  )}

                  {/* Trecho das observações */}
                  {h.observacoes && (
                    <p className="text-gray-600 italic leading-snug">
                      "{truncate(h.observacoes, 80)}"
                    </p>
                  )}
                  {!h.observacoes && !h.motivo && (
                    <p className="text-gray-400 italic">Sem registros clínicos.</p>
                  )}

                  {/* Botão ver completo */}
                  <button
                    onClick={() => setSelectedHistoricoItem(h)}
                    style={{
                      width: '100%',
                      background: 'white',
                      color: '#7c3aed',
                      border: '1px solid #ddd6fe',
                      borderRadius: '8px',
                      padding: '6px 0',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Ver atendimento completo →
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
