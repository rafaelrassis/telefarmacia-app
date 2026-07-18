import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Timer, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PERIODOS = [
  { dias: 7,  label: '7 dias'  },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];

const Estrelas = ({ nota, size = 16 }) => (
  <span style={{ letterSpacing: 1 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} style={{ fontSize: size, color: n <= nota ? '#f59e0b' : '#e5e7eb' }}>★</span>
    ))}
  </span>
);

const MetricasTab = () => {
  const { token } = useAuth();
  const [dias, setDias]         = useState(30);
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchMetricas = useCallback(async (periodo) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/me/metricas?dias=${periodo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setMetricas(await res.json());
    } catch {
      setError('Não foi possível carregar as métricas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMetricas(dias); }, [dias, fetchMetricas]);

  if (loading && !metricas) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !metricas) {
    return (
      <div className="bg-error-wash border border-error/30 rounded-xl p-5 text-center">
        <p className="text-sm text-error m-0">{error}</p>
        <button
          onClick={() => fetchMetricas(dias)}
          className="mt-3 text-xs font-bold text-error underline underline-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const concluidas = metricas?.concluidas;
  const avaliacoes = metricas?.avaliacoes;

  return (
    <div className="space-y-5">
      {/* Seletor de período */}
      <div className="flex gap-2">
        {PERIODOS.map((p) => {
          const active = dias === p.dias;
          return (
            <button
              key={p.dias}
              onClick={() => setDias(p.dias)}
              disabled={loading}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition disabled:opacity-60 ${
                active
                  ? 'bg-brand text-white border-brand'
                  : 'bg-canvas text-muted border-line hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {loading && metricas && (
          <span className="self-center w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Consultas concluídas */}
        <div className="bg-canvas border border-line rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-brand" strokeWidth={2.25} />
            <p className="text-xs font-semibold text-muted uppercase tracking-wide m-0">Consultas concluídas</p>
          </div>
          <p className="text-3xl font-bold text-ink m-0">{concluidas?.total ?? 0}</p>
          <p className="text-xs text-muted mt-2 m-0">
            {concluidas?.agendadas ?? 0} agendada{(concluidas?.agendadas ?? 0) === 1 ? '' : 's'} · {concluidas?.urgentes ?? 0} urgente{(concluidas?.urgentes ?? 0) === 1 ? '' : 's'}
          </p>
        </div>

        {/* Tempo médio */}
        <div className="bg-canvas border border-line rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-brand" strokeWidth={2.25} />
            <p className="text-xs font-semibold text-muted uppercase tracking-wide m-0">Tempo médio de atendimento</p>
          </div>
          {metricas?.tempoMedioMin != null ? (
            <p className="text-3xl font-bold text-ink m-0">
              {metricas.tempoMedioMin}<span className="text-base font-semibold text-muted"> min</span>
            </p>
          ) : (
            <>
              <p
                className="text-3xl font-bold text-muted m-0 cursor-help"
                title="Disponível a partir das próximas consultas"
              >
                —
              </p>
              <p className="text-xs text-muted mt-2 m-0">Disponível a partir das próximas consultas</p>
            </>
          )}
        </div>

        {/* Nota média */}
        <div className="bg-canvas border border-line rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-brand" strokeWidth={2.25} />
            <p className="text-xs font-semibold text-muted uppercase tracking-wide m-0">Nota média</p>
          </div>
          {avaliacoes?.notaMedia != null ? (
            <>
              <p className="text-3xl font-bold text-ink m-0">{avaliacoes.notaMedia.toFixed(1)}</p>
              <div className="mt-1">
                <Estrelas nota={Math.round(avaliacoes.notaMedia)} />
              </div>
              <p className="text-xs text-muted mt-1 m-0">
                {avaliacoes.total} avaliaç{avaliacoes.total === 1 ? 'ão' : 'ões'} no período
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-muted m-0">—</p>
              <p className="text-xs text-muted mt-2 m-0">Sem avaliações no período</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricasTab;
