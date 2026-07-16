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

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit' });

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

// ── Export CSV (client-side) ──────────────────────────────────────────────────

const exportCSV = (items, de, ate, percentual) => {
  const header = ['Data', 'Paciente', 'Tipo', 'Valor cobrado (R$)', 'Comissão %', 'Valor líquido (R$)', 'Status', 'Data repasse'];
  const rows = items.map((i) => [
    fmtDateTime(i.data),
    i.paciente,
    i.tipo === 'agendada' ? 'Agendada' : 'Urgente',
    Number(i.valor).toFixed(2).replace('.', ','),
    `${i.comissaoPercentual ?? percentual}%${i.estimado ? ' (estimado)' : ''}`,
    Number(i.ganho).toFixed(2).replace('.', ','),
    i.repassado ? 'Repassado' : 'A receber',
    i.repassadoEm ? fmtDate(i.repassadoEm) : '',
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `extrato_ganhos_${de}_${ate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Export PDF via print window ───────────────────────────────────────────────

const exportPDF = (items, de, ate, metricas) => {
  const rows = items.map((i) => `
    <tr>
      <td>${fmtDateTime(i.data)}</td>
      <td>${i.paciente}</td>
      <td>${i.tipo === 'agendada' ? 'Agendada' : 'Urgente'}</td>
      <td style="text-align:right">${fmtBRL(i.valor)}</td>
      <td style="text-align:right">${fmtBRL(i.ganho)}</td>
      <td style="text-align:center;color:${i.repassado ? '#15803d' : '#b45309'}">
        ${i.repassado ? '✓ Repassado' : '⏳ A receber'}
        ${i.repassadoEm ? `<br><small>${fmtDate(i.repassadoEm)}</small>` : ''}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Extrato de Ganhos ${de} a ${ate}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 20px; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .sub { color: #555; font-size: 11px; margin-bottom: 16px; }
    .metrics { display: flex; gap: 24px; margin-bottom: 20px; }
    .metric { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; }
    .metric-label { font-size: 9px; text-transform: uppercase; color: #888; }
    .metric-value { font-size: 15px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; font-size: 10px; text-align: left; padding: 6px 8px; border-bottom: 2px solid #d1d5db; }
    td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    @media print { .no-print { display: none; } }
  </style></head><body>
  <h1>Extrato de Ganhos</h1>
  <p class="sub">Período: ${de} a ${ate} &nbsp;|&nbsp; Comissão: ${metricas.percentualComissao}%</p>
  <div class="metrics">
    <div class="metric"><div class="metric-label">Ganho no período</div><div class="metric-value">${fmtBRL(metricas.totalRecebido)}</div></div>
    <div class="metric"><div class="metric-label">A receber (total)</div><div class="metric-value">${fmtBRL(metricas.aReceber ?? 0)}</div></div>
    <div class="metric"><div class="metric-label">Total no ano</div><div class="metric-value">${fmtBRL(metricas.totalAno ?? 0)}</div></div>
  </div>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:6px 14px;cursor:pointer">Imprimir / Salvar PDF</button>
  <table><thead><tr>
    <th>Data</th><th>Paciente</th><th>Tipo</th>
    <th style="text-align:right">Cobrado</th>
    <th style="text-align:right">Comissão</th>
    <th style="text-align:center">Status repasse</th>
  </tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

const MetricCard = ({ label, value, sub, subColor, highlight }) => (
  <div className={`border rounded-xl p-4 flex flex-col gap-1 min-w-0 ${highlight ? 'bg-brand-wash border-brand/30' : 'bg-canvas border-line'}`}>
    <p className="text-[10px] font-semibold text-muted uppercase tracking-widest truncate">{label}</p>
    <p className={`text-xl font-bold truncate ${highlight ? 'text-brand-deep' : 'text-ink'}`}>{value}</p>
    {sub && <p className={`text-xs font-medium truncate ${subColor ?? 'text-muted'}`}>{sub}</p>}
  </div>
);

const BarChart = ({ data }) => {
  const max  = Math.max(...data.map((d) => d.total), 1);
  const step = data.length <= 7 ? 1 : data.length <= 14 ? 2 : data.length <= 31 ? 5 : 7;

  return (
    <div>
      <div className="flex items-end overflow-x-auto pb-1" style={{ height: 120, gap: data.length > 30 ? 1 : 3 }}>
        {data.map((d) => {
          const h = d.total > 0 ? Math.max(Math.round((d.total / max) * 112), 3) : 0;
          return (
            <div
              key={d.data}
              className="shrink-0 rounded-t-sm transition-colors cursor-default"
              style={{ flex: 1, minWidth: data.length > 60 ? 4 : 8, height: h || 2, backgroundColor: d.total > 0 ? 'var(--color-brand)' : 'var(--color-line)' }}
              title={`${d.label}: ${fmtBRL(d.total)}`}
            />
          );
        })}
      </div>
      <div className="flex overflow-hidden mt-1" style={{ gap: data.length > 30 ? 1 : 3 }}>
        {data.map((d, i) => (
          <div key={d.data} className="shrink-0 text-center" style={{ flex: 1, minWidth: data.length > 60 ? 4 : 8 }}>
            {i % step === 0 && <span className="text-[9px] text-muted leading-none">{d.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const TIPO_LABEL = { agendada: 'Agendada', urgente: 'Urgente' };
const TIPO_CLS   = { agendada: 'bg-brand-wash text-brand-deep', urgente: 'bg-error-wash text-error' };

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
  const [exportingCsv, setExportingCsv] = useState(false);
  // Mantém todos os itens carregados (para export)
  const [allLoadedItems, setAllLoadedItems] = useState([]);

  // Repasses recebidos (independente do filtro de período acima)
  const [repassesData, setRepassesData]       = useState(null);
  const [loadingRepasses, setLoadingRepasses] = useState(true);

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
    setAllLoadedItems([]);

    const params = new URLSearchParams({ page: '1' });
    if (de)  params.set('de',  de);
    if (ate) params.set('ate', ate);

    fetch(`${API_URL}/api/farmaceutico/ganhos?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) {
          setGData(d);
          setAllLoadedItems(d.lista.items);
        }
      })
      .catch(() => { if (!cancelled) setFetchError('Erro ao carregar dados de ganhos.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [de, ate, token, preset]);

  // Repasses recebidos (independente do período filtrado acima)
  useEffect(() => {
    let cancelled = false;
    setLoadingRepasses(true);
    fetch(`${API_URL}/api/farmaceutico/me/repasses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setRepassesData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingRepasses(false); });
    return () => { cancelled = true; };
  }, [token]);

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
          prev ? { ...prev, lista: { ...d.lista, items: [...prev.lista.items, ...d.lista.items] } } : d
        );
        setAllLoadedItems((prev) => [...prev, ...d.lista.items]);
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExportCSV = async () => {
    if (!gData) return;
    setExportingCsv(true);
    try {
      const params = new URLSearchParams();
      if (de)  params.set('de',  de);
      if (ate) params.set('ate', ate);
      const res = await fetch(`${API_URL}/api/farmaceutico/ganhos/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `ganhos-${de}_a_${ate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Fallback: exporta os itens já carregados no cliente
        exportCSV(allLoadedItems, de, ate, gData.metricas.percentualComissao);
      }
    } catch {
      exportCSV(allLoadedItems, de, ate, gData.metricas.percentualComissao);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPDF = () => {
    if (!gData) return;
    exportPDF(allLoadedItems, de, ate, gData.metricas);
  };

  const m = gData?.metricas;
  const hasPrev     = m?.prevTotal > 0;
  const compSign    = (m?.comparativo ?? 0) > 0 ? '+' : '';
  const compColor   = (m?.comparativo ?? 0) > 0 ? 'text-success'
                    : (m?.comparativo ?? 0) < 0 ? 'text-error'
                    : 'text-muted';
  const compDisplay = hasPrev || (m?.comparativo ?? 0) !== 0 ? `${compSign}${m?.comparativo}%` : '—';
  const compSub     = hasPrev || (m?.comparativo ?? 0) !== 0 ? 'vs período anterior' : 'sem dados anteriores';

  return (
    <div className="space-y-5">

      {/* ── Filtro de período ── */}
      <div className="flex flex-wrap gap-2 items-end">
        {[
          { id: 'mes', label: 'Este mês' },
          { id: '7d',  label: 'Últimos 7 dias' },
          { id: 'custom', label: 'Personalizado' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition ${
              preset === p.id
                ? 'bg-brand text-brand-contrast shadow-sm'
                : 'bg-canvas border border-line text-muted hover:border-brand'
            }`}
          >
            {p.label}
          </button>
        ))}

        {preset === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted font-medium">De</label>
              <input type="date" value={customDe} max={today} onChange={(e) => setCustomDe(e.target.value)}
                className="text-sm border border-line rounded-lg px-3 py-1.5 text-ink bg-canvas focus:ring-2 focus:ring-brand outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted font-medium">Até</label>
              <input type="date" value={customAte} min={customDe || undefined} max={today} onChange={(e) => setCustomAte(e.target.value)}
                className="text-sm border border-line rounded-lg px-3 py-1.5 text-ink bg-canvas focus:ring-2 focus:ring-brand outline-none" />
            </div>
          </>
        )}
      </div>

      {/* ── Estados de carga / erro ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fetchError ? (
        <p className="text-error text-sm py-4 text-center">{fetchError}</p>
      ) : !gData ? null : (
        <>
          {/* ── Totalizadores globais ── */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="A receber (acumulado)"
              value={fmtBRL(m.aReceber ?? 0)}
              sub="consultas não repassadas"
              highlight
            />
            <MetricCard
              label="Repassado no mês"
              value={fmtBRL(m.repassadoMes ?? 0)}
              sub="pagamentos recebidos"
              subColor="text-success"
            />
            <MetricCard
              label="Total no ano"
              value={fmtBRL(m.totalAno ?? 0)}
              sub="ganho líquido acumulado"
            />
          </div>

          {/* ── Métricas do período ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Ganho líquido (período)"
              value={fmtBRL(m.totalRecebido)}
              sub={m.percentualComissao != null ? `${m.percentualComissao}% de comissão` : undefined}
              subColor="text-brand"
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
            <MetricCard label="Variação" value={compDisplay} sub={compSub} subColor={compColor} />
          </div>

          {/* ── Gráfico ── */}
          {gData.grafico.length > 0 && (
            <div className="bg-canvas border border-line rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Ganhos por dia</h3>
                {m.totalRecebido > 0 && (
                  <p className="text-xs text-muted">Máx: {fmtBRL(Math.max(...gData.grafico.map((d) => d.total)))}</p>
                )}
              </div>
              {m.totalRecebido === 0 ? (
                <p className="text-sm text-muted italic text-center py-6">Nenhum ganho no período para exibir</p>
              ) : (
                <BarChart data={gData.grafico} />
              )}
            </div>
          )}

          {/* ── Repasses recebidos ── */}
          <div className="bg-canvas border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line">
              <h3 className="text-sm font-semibold text-ink">Repasses</h3>
            </div>
            {loadingRepasses ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !repassesData ? (
              <p className="text-sm text-muted text-center py-8">Erro ao carregar repasses.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 p-5">
                  <MetricCard
                    label="Saldo pendente"
                    value={fmtBRL(repassesData.resumo.saldo_pendente)}
                    sub="ainda não repassado"
                    highlight
                  />
                  <MetricCard
                    label="Total repassado"
                    value={fmtBRL(repassesData.resumo.total_repassado)}
                    subColor="text-success"
                  />
                  <MetricCard
                    label="Líquido acumulado"
                    value={fmtBRL(repassesData.resumo.liquido_acumulado)}
                    sub="histórico completo"
                  />
                </div>
                {repassesData.data.length > 0 && (
                  <div className="divide-y divide-line border-t border-line">
                    {repassesData.data.map((r) => (
                      <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-ink">
                            {fmtDate(r.periodoInicio)} – {fmtDate(r.periodoFim)}
                          </p>
                          <p className="text-xs text-muted">
                            recebido em {fmtDate(r.criadoEm)}{r.referencia ? ` · ref: ${r.referencia}` : ''}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-success">{fmtBRL(r.valor)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Lista detalhada ── */}
          <div className="bg-canvas border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-ink">Detalhamento</h3>
                <span className="text-xs text-muted">
                  {gData.lista.total} {gData.lista.total === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              {gData.lista.total > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={exportingCsv}
                    className="text-xs font-semibold text-brand-deep border border-brand/30 rounded-lg px-3 py-1.5 hover:bg-brand-wash transition disabled:opacity-50"
                  >
                    {exportingCsv ? 'Exportando…' : '↓ CSV'}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="text-xs font-semibold text-muted border border-line rounded-lg px-3 py-1.5 hover:bg-surface transition"
                  >
                    🖨 PDF
                  </button>
                </div>
              )}
            </div>

            {gData.lista.items.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted italic">
                Nenhuma consulta concluída no período.
              </div>
            ) : (
              <>
                <div className="divide-y divide-line">
                  {gData.lista.items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-ink truncate">{item.paciente}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TIPO_CLS[item.tipo] ?? 'bg-surface text-muted'}`}>
                            {TIPO_LABEL[item.tipo] ?? item.tipo}
                          </span>
                          {/* Badge de repasse */}
                          {item.repassado ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-success-wash text-success">
                              ✓ Repassado
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-alert-wash text-alert">
                              ⏳ A receber
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted">{fmtDateTime(item.data)}</p>
                          {item.repassado && item.repassadoEm && (
                            <p className="text-xs text-success">· repassado em {fmtDate(item.repassadoEm)}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-brand-deep">{fmtBRL(item.ganho ?? item.valor)}</p>
                        {item.ganho != null && item.ganho !== item.valor && (
                          <p className="text-[10px] text-muted mt-0.5">{fmtBRL(item.valor)} cobrado</p>
                        )}
                        {item.comissaoPercentual != null && (
                          <p className="text-[10px] text-muted mt-0.5">
                            comissão {item.comissaoPercentual}%
                            {item.estimado && <span className="text-alert"> · estimado</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {gData.lista.hasMore && (
                  <div className="px-5 py-4 border-t border-line text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-5 py-2 text-sm font-semibold border border-line rounded-xl hover:bg-surface disabled:opacity-50 transition text-muted"
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
