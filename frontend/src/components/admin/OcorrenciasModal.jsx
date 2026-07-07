import React, { useState, useCallback, useEffect } from 'react';
import { fmtDt } from '../../utils/adminFormat';

// ── Modal: ocorrências (devoluções / sem-contato) de um farmacêutico ────────

const OCORRENCIA_ACAO_LABEL = {
  devolvido:    'Devolução à fila',
  sem_contato:  'Sem contato com paciente',
};

const OcorrenciasModal = ({ api, farmaceutico, onClose }) => {
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchPage = useCallback(async (pg) => {
    setLoading(true);
    try {
      const res = await api(`/api/admin/farmaceuticos/${farmaceutico.id}/ocorrencias?page=${pg}&limit=${LIMIT}`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.data ?? []);
        setTotal(d.total ?? 0);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [api, farmaceutico.id]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const goPage = (pg) => { setPage(pg); fetchPage(pg); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">Ocorrências (30d)</h3>
            <p className="text-xs text-gray-500 mt-0.5">{farmaceutico.name} — {farmaceutico.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma ocorrência nos últimos 30 dias.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={it.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      it.acao === 'devolvido' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {OCORRENCIA_ACAO_LABEL[it.acao] ?? it.acao}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDt(it.criadoEm)}</span>
                  </div>
                  {it.detalhes?.motivo && (
                    <p className="text-xs text-gray-500 mt-1">Motivo: {it.detalhes.motivo}</p>
                  )}
                  {it.detalhes?.tipo && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Consulta {it.detalhes.tipo}</p>
                  )}
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  disabled={page <= 1}
                  onClick={() => goPage(page - 1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  ‹
                </button>
                <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OcorrenciasModal;
