import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v) =>
  `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

const getBRDate = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return { today: `${y}-${m}-${day}`, firstOfMonth: `${y}-${m}-01`, y, m, day };
};

const daysAgoBR = (n) => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

const MetricCard = ({ label, value, sub, subColor }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1 min-w-0">
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest truncate">{label}</p>
    <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
    {sub && <p className={`text-xs font-medium truncate ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
  </div>
);

const BarChart = ({ data }) => {
  const max = Math.max(...data.map((d) => d.total), 1);
  const step = data.length <= 7 ? 1 : data.length <= 14 ? 2 : data.length <= 31 ? 5 : 7;

  return (
    <div>
      {/* Bars */}
      <div
        className="flex items-end overflow-x-auto pb-1"
        style={{ height: 120, gap: data.length > 30 ? 1 : 3 }}
      >
        {data.map((d) => {
          const h = d.total > 0 ? Math.max(Math.round((d.total / max) * 112), 3) : 0;
          return (
            <div
              key={d.data}
              className="shrink-0 rounded-t-sm transition-colors cursor-default"
              style={{
                flex:            1,
                minWidth:        data.length > 60 ? 4 : 8,
                height:          h || 2,
                backgroundColor: d.total > 0 ? '#7c3aed' : '#e5e7eb',
              }}
              title={`${d.label}: ${fmtBRL(d.total)}`}
            />
          );
        })}
      </div>
      {/* X-axis labels */}
      <div
        className="flex overflow-hidden mt-1"
        style={{ gap: data.length > 30 ? 1 : 3 }}
      >
        {data.map((d, i) => (
          <div
            key={d.data}
            className="shrink-0 text-center"
            style={{ flex: 1, minWidth: data.length > 60 ? 4 : 8 }}
          >
            {i % step === 0 && (
              <span className="text-[9px] text-gray-400 leading-none">{d.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const TIPO_LABEL = { agendada: 'Agendada', urgente: 'Urgente' };
const TIPO_CLS   = { agendada: 'bg-violet-100 text-violet-700', urgente: 'bg-red-100 text-red-700' };

const GanhosTab = () => {
  const { token } = useAuth();
  const [preset, setPreset]           = useState('mes');
  const [customDe, setCustomDe]       = useState('');
  const [customAte, setCustomAte]     = useState('');
  const [page, setPage]               = useState(1);
  const [gData, setGData]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError]   = useState('');

  const { today, firstOfMonth } = useMemo(() => getBRDate(), []);

  const { de, ate } = useMemo(() => {
    if (preset === '7d')    return { de: daysAgoBR(6), ate: today };
    if (preset === 'mes')   return { de: firstOfMonth, ate: today };
    return { de: customDe, ate: customAte };
  }, [preset, customDe, customAte, today, firstOfMonth]);

  // Fetch inicial / ao mudar período
  useEffect(() => {
    if (preset === 'custom' && (!customDe || !customAte)) return;
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    setPage(1);

    const params = new URLSearchParams({ page: '1' });
    if (de)  params.set('de',  de);
    if (ate) params.set('ate', ate);

    fetch(`${API_URL}/api/farmaceutico/ganhos?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setGData(d); })
      .catch(() => { if (!cancelled) setFetchError('Erro ao carregar dados de ganhos.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [de, ate, token, preset]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({ page: String(nextPage) });
    if (de)  params.set('de',  de);
    if (ate) params.set('ate', ate);
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/ganhos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setGData((prev) =>
          prev
            ? { ...prev, lista: { ...d.lista, items: [...prev.lista.items, ...d.lista.items] } }
            : d
        );
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Formatação do comparativo
  const m = gData?.metricas;
  const hasPrev     = m?.prevTotal > 0;
  const compSign    = (m?.comparativo ?? 0) > 0 ? '+' : '';
  const compColor   = (m?.comparativo ?? 0) > 0 ? 'text-green-600'
                    : (m?.comparativo ?? 0) < 0 ? 'text-red-500'
                    : 'text-gray-400';
  const compDisplay = hasPrev || (m?.comparativo ?? 0) !== 0
    ? `${compSign}${m?.comparativo}%`
    : '—';
  const compSub = hasPrev || (m?.comparativo ?? 0) !== 0
    ? 'vs período anterior'
    : 'sem dados anteriores';

  return (
    <div className="space-y-5">

      {/* ── Filtro de período ── */}
      <div className="flex flex-wrap gap-2 items-end">
        {[
          { id: 'mes', label: 'Este mês'       },
          { id: '7d',  label: 'Últimos 7 dias'  },
          { id: 'custom', label: 'Personalizado' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition ${
              preset === p.id
                ? 'bg-violet-700 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-400'
            }`}
          >
            {p.label}
          </button>
        ))}

        {preset === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">De</label>
              <input
                type="date"
                value={customDe}
                max={today}
                onChange={(e) => setCustomDe(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Até</label>
              <input
                type="date"
                value={customAte}
                min={customDe || undefined}
                max={today}
                onChange={(e) => setCustomAte(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none"
              />
            </div>
          </>
        )}
      </div>

      {/* ── Estados de carga / erro ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fetchError ? (
        <p className="text-red-500 text-sm py-4 text-center">{fetchError}</p>
      ) : !gData ? null : (
        <>
          {/* ── Métricas ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Seu ganho líquido"
              value={fmtBRL(m.totalRecebido)}
              sub={m.percentualComissao != null ? `${m.percentualComissao}% de comissão` : undefined}
              subColor="text-violet-500"
            />
            <MetricCard
              label="Total cobrado"
              value={fmtBRL(m.totalBruto ?? m.totalRecebido)}
              sub={m.consultasConcluidas === 1 ? '1 atendimento' : `${m.consultasConcluidas} atendimentos`}
            />
            <MetricCard
              label="Ticket médio líquido"
              value={m.consultasConcluidas > 0 ? fmtBRL(m.ticketMedio) : '—'}
              sub="por consulta"
            />
            <MetricCard
              label="Variação"
              value={compDisplay}
              sub={compSub}
              subColor={compColor}
            />
          </div>

          {/* ── Gráfico ── */}
          {gData.grafico.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Ganhos por dia</h3>
                {m.totalRecebido > 0 && (
                  <p className="text-xs text-gray-400">
                    Máx: {fmtBRL(Math.max(...gData.grafico.map((d) => d.total)))}
                  </p>
                )}
              </div>
              {m.totalRecebido === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-6">
                  Nenhum ganho no período para exibir
                </p>
              ) : (
                <BarChart data={gData.grafico} />
              )}
            </div>
          )}

          {/* ── Lista detalhada ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Detalhamento</h3>
              <span className="text-xs text-gray-400">
                {gData.lista.total} {gData.lista.total === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {gData.lista.items.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400 italic">
                Nenhuma consulta concluída no período.
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {gData.lista.items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.paciente}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIPO_CLS[item.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                            {TIPO_LABEL[item.tipo] ?? item.tipo}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(item.data)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-violet-700">{fmtBRL(item.ganho ?? item.valor)}</p>
                        {item.ganho != null && item.ganho !== item.valor && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{fmtBRL(item.valor)} cobrado</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {gData.lista.hasMore && (
                  <div className="px-5 py-4 border-t border-gray-100 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-5 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition text-gray-600"
                    >
                      {loadingMore ? 'Carregando...' : 'Carregar mais'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GanhosTab;
