import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../ui/Modal';
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
    <Modal title="Ocorrências (30d)" onClose={onClose} maxWidth="max-w-lg">
      <div className="px-6 pt-4 pb-6">
        <p className="text-xs text-muted -mt-2 mb-4">{farmaceutico.name} — {farmaceutico.email}</p>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Nenhuma ocorrência nos últimos 30 dias.</p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      it.acao === 'devolvido' ? 'bg-alert-wash text-alert' : 'bg-error-wash text-error'
                    }`}>
                      {OCORRENCIA_ACAO_LABEL[it.acao] ?? it.acao}
                    </span>
                    <span className="text-xs text-muted">{fmtDt(it.criadoEm)}</span>
                  </div>
                  {it.detalhes?.motivo && (
                    <p className="text-xs text-muted mt-1">Motivo: {it.detalhes.motivo}</p>
                  )}
                  {it.detalhes?.tipo && (
                    <p className="text-[11px] text-muted mt-0.5">Consulta {it.detalhes.tipo}</p>
                  )}
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-line">
                <button
                  disabled={page <= 1}
                  onClick={() => goPage(page - 1)}
                  aria-label="Página anterior"
                  className="p-1 rounded border border-line disabled:opacity-40 text-ink"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                  aria-label="Próxima página"
                  className="p-1 rounded border border-line disabled:opacity-40 text-ink"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default OcorrenciasModal;
