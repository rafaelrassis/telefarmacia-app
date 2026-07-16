import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Paginacao from './Paginacao';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit' });

const Estrelas = ({ nota, size = 16 }) => (
  <span style={{ letterSpacing: 1 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} style={{ fontSize: size, color: n <= nota ? '#f59e0b' : '#e5e7eb' }}>★</span>
    ))}
  </span>
);

const AvaliacoesTab = () => {
  const { token } = useAuth();
  const [resumo, setResumo]   = useState(null);
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);

  const LIMIT = 10;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchPage = useCallback(async (pg) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/me/avaliacoes?page=${pg}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setResumo({ media: d.media, total: d.total, distribuicao: d.distribuicao });
        setItems(d.data ?? []);
        setTotal(d.total ?? 0);
      }
    } catch { /* silencioso — aba não crítica */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const goPage = (pg) => { setPage(pg); fetchPage(pg); };

  const maxDistribuicao = resumo
    ? Math.max(...Object.values(resumo.distribuicao), 1)
    : 1;

  if (loading && !resumo) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-canvas border border-line rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-bold text-ink">
            {resumo?.media != null ? resumo.media.toFixed(1) : '—'}
          </p>
          {resumo?.media != null && <Estrelas nota={Math.round(resumo.media)} size={20} />}
          <p className="text-xs text-muted mt-2">
            {resumo?.total ?? 0} {resumo?.total === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </div>

        <div className="bg-canvas border border-line rounded-xl p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Distribuição por nota</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const qtd = resumo?.distribuicao?.[String(n)] ?? 0;
              const pct = Math.round((qtd / maxDistribuicao) * 100);
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-xs text-muted w-3">{n}</span>
                  <div className="flex-1 h-2.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-alert rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted w-6 text-right">{qtd}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de comentários */}
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line">
          <p className="font-semibold text-ink text-sm">Comentários</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted text-sm">Você ainda não recebeu avaliações.</div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <Estrelas nota={a.nota} size={14} />
                  <span className="text-xs text-muted">{fmtDate(a.createdAt)}</span>
                </div>
                <p className="text-sm text-muted">{a.pacienteNome}</p>
                {a.comentario && <p className="text-sm text-muted mt-1">{a.comentario}</p>}
              </li>
            ))}
          </ul>
        )}
        <div className="px-5 pb-4">
          <Paginacao page={page} totalPages={totalPages} onPageChange={goPage} />
        </div>
      </div>
    </div>
  );
};

export default AvaliacoesTab;
