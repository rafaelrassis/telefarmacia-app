import React, { useState, useCallback, useEffect } from 'react';
import ConsultaModal from '../ConsultaModal';
import Paginacao from '../Paginacao';
import { fmtDt, SEL_STYLE } from '../../utils/adminFormat';

// ── Aba "Avaliações" (admin) ─────────────────────────────────────────────────

export const Estrelas = ({ nota, size = 16 }) => (
  <span style={{ letterSpacing: 1 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} style={{ fontSize: size, color: n <= Math.round(nota) ? '#f59e0b' : '#e5e7eb' }}>★</span>
    ))}
  </span>
);

const StatMini = ({ label, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
    <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-1">{label}</p>
  </div>
);

const AvaliacoesAdminTab = ({ api, pharmacists = [] }) => {
  const [filterDe, setFilterDe]       = useState('');
  const [filterAte, setFilterAte]     = useState('');
  const [filterNota, setFilterNota]   = useState('');
  const [filterFarm, setFilterFarm]   = useState('');

  const [resumo, setResumo]           = useState(null);
  const [loadingResumo, setLoadingResumo] = useState(true);

  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewingConsulta, setViewingConsulta] = useState(null);

  const LIMIT = 20;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchResumo = useCallback(async () => {
    setLoadingResumo(true);
    try {
      const p = new URLSearchParams();
      if (filterDe)  p.set('de', filterDe);
      if (filterAte) p.set('ate', filterAte);
      const res = await api(`/api/admin/avaliacoes/resumo?${p}`);
      if (res.ok) setResumo(await res.json());
    } catch (_) {}
    finally { setLoadingResumo(false); }
  }, [api, filterDe, filterAte]);

  const buildParams = useCallback((pg) => {
    const p = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
    if (filterDe)   p.set('de', filterDe);
    if (filterAte)  p.set('ate', filterAte);
    if (filterNota) p.set('nota', filterNota);
    if (filterFarm) p.set('farmaceuticoId', filterFarm);
    return p;
  }, [filterDe, filterAte, filterNota, filterFarm]);

  const fetchItems = useCallback(async (pg) => {
    setLoading(true);
    try {
      const res = await api(`/api/admin/avaliacoes?${buildParams(pg)}`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.data ?? []);
        setTotal(d.total ?? 0);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [api, buildParams]);

  useEffect(() => { fetchResumo(); }, [fetchResumo]);
  useEffect(() => { setPage(1); fetchItems(1); }, [fetchItems]);

  const goPage = (pg) => { setPage(pg); fetchItems(pg); };

  const hasAnyFilter = filterDe || filterAte || filterNota || filterFarm;

  const pctNota5 = resumo?.total > 0 ? Math.round((resumo.distribuicao['5'] / resumo.total) * 100) : 0;
  const pctBaixas = resumo?.total > 0
    ? Math.round(((resumo.distribuicao['1'] + resumo.distribuicao['2']) / resumo.total) * 100)
    : 0;

  const maxDistribuicao = resumo ? Math.max(...Object.values(resumo.distribuicao), 1) : 1;
  const maxEvolucao = resumo ? Math.max(...resumo.evolucao_mensal.map((m) => m.total), 1) : 1;

  return (
    <div className="space-y-4">
      {/* Filtro de período compartilhado */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">De</label>
          <input type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} style={SEL_STYLE} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Até</label>
          <input type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} style={SEL_STYLE} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Nota</label>
          <select value={filterNota} onChange={(e) => setFilterNota(e.target.value)} style={SEL_STYLE}>
            <option value="">Todas</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrela{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        {pharmacists.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Farmacêutico</label>
            <select value={filterFarm} onChange={(e) => setFilterFarm(e.target.value)} style={SEL_STYLE}>
              <option value="">Todos</option>
              {pharmacists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {hasAnyFilter && (
          <button
            onClick={() => { setFilterDe(''); setFilterAte(''); setFilterNota(''); setFilterFarm(''); }}
            style={{ ...SEL_STYLE, background: '#fff', color: '#6b7280', cursor: 'pointer' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loadingResumo || !resumo ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{resumo.media_geral != null ? resumo.media_geral.toFixed(1) : '—'}</p>
              {resumo.media_geral != null && <Estrelas nota={resumo.media_geral} size={16} />}
              <p className="text-xs text-gray-500 mt-1">Média geral</p>
            </div>
            <StatMini label="Total no período" value={resumo.total} />
            <StatMini label="% notas 5" value={`${pctNota5}%`} color="text-green-600" />
            <StatMini label="% notas ≤ 2" value={`${pctBaixas}%`} color={pctBaixas > 0 ? 'text-red-600' : 'text-gray-900'} />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribuição por nota */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Distribuição por nota</p>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const qtd = resumo.distribuicao[String(n)] ?? 0;
                  const pct = Math.round((qtd / maxDistribuicao) * 100);
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-3">{n}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">{qtd}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evolução mensal (últimos 6 meses) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Evolução mensal (6 meses)</p>
              <div className="flex items-end gap-2" style={{ height: 100 }}>
                {resumo.evolucao_mensal.map((m) => {
                  const h = m.total > 0 ? Math.max(Math.round((m.total / maxEvolucao) * 90), 4) : 2;
                  return (
                    <div key={m.mes} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
                      <span className="text-[10px] text-gray-500 font-semibold">{m.media != null ? m.media.toFixed(1) : '—'}</span>
                      <div className="w-full rounded-t-sm bg-violet-500" style={{ height: h }} title={`${m.total} avaliações`} />
                      <span className="text-[9px] text-gray-400">{m.mes.slice(5)}/{m.mes.slice(2, 4)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ranking por farmacêutico */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Ranking por farmacêutico</p>
            </div>
            {resumo.por_farmaceutico.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhuma avaliação no período.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Farmacêutico</th>
                    <th className="text-left px-4 py-2.5">Média</th>
                    <th className="text-left px-4 py-2.5">Avaliações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resumo.por_farmaceutico.map((f) => (
                    <tr key={f.id} className={f.media < 3.5 ? 'bg-amber-50' : ''}>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">{f.nome}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-semibold ${f.media < 3.5 ? 'text-amber-700' : 'text-gray-700'}`}>
                          {f.media.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{f.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Tabela paginada de avaliações individuais */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm">Avaliações</p>
          {!loading && <span className="text-xs text-gray-400">{total} {total === 1 ? 'registro' : 'registros'}</span>}
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhuma avaliação encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data</th>
                  <th className="text-left px-4 py-3">Nota</th>
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3">Farmacêutico</th>
                  <th className="text-left px-4 py-3">Comentário</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDt(a.data)}</td>
                    <td className="px-4 py-3"><Estrelas nota={a.nota} size={13} /></td>
                    <td className="px-4 py-3 text-gray-800 font-medium text-xs">{a.pacienteNome}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{a.farmaceuticoNome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[220px] truncate">{a.comentario || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.tipo === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>
                        {a.tipo === 'urgente' ? 'Urgente' : 'Agendada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewingConsulta({ id: a.consultaId, tipo: a.tipo })}
                        style={{
                          background: 'transparent', border: '1.5px solid #ddd6fe',
                          color: '#7c3aed', borderRadius: 8, padding: '4px 10px',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        👁 Ver consulta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 pb-4">
          {!loading && <Paginacao page={page} totalPages={totalPages} onPageChange={goPage} />}
        </div>
      </div>

      {viewingConsulta && (
        <ConsultaModal
          id={viewingConsulta.id}
          tipo={viewingConsulta.tipo}
          modo="visualizacao"
          onClose={() => setViewingConsulta(null)}
        />
      )}
    </div>
  );
};

export default AvaliacoesAdminTab;
