import React, { useState, useCallback, useEffect } from 'react';
import { Star, Eye, X } from 'lucide-react';
import ConsultaModal from '../ConsultaModal';
import Paginacao from '../Paginacao';
import { fmtDt } from '../../utils/adminFormat';

// ── Aba "Avaliações" (admin) ─────────────────────────────────────────────────

const selectCls = 'text-sm border border-line rounded-lg px-2.5 py-1.5 outline-none bg-canvas text-ink focus:ring-2 focus:ring-brand';

export const Estrelas = ({ nota, size = 16 }) => (
  <span className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        width={size}
        height={size}
        className={n <= Math.round(nota) ? 'text-amber-400' : 'text-line'}
        fill="currentColor"
        strokeWidth={0}
      />
    ))}
  </span>
);

const StatMini = ({ label, value, color }) => (
  <div className="bg-canvas border border-line rounded-xl p-4 text-center">
    <p className={`text-2xl font-heading font-bold ${color ?? 'text-ink'}`}>{value}</p>
    <p className="text-xs text-muted mt-1">{label}</p>
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
          <label htmlFor="avaliacoes-filtro-de" className="text-xs text-muted font-medium">De</label>
          <input id="avaliacoes-filtro-de" type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} className={selectCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="avaliacoes-filtro-ate" className="text-xs text-muted font-medium">Até</label>
          <input id="avaliacoes-filtro-ate" type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} className={selectCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="avaliacoes-filtro-nota" className="text-xs text-muted font-medium">Nota</label>
          <select id="avaliacoes-filtro-nota" value={filterNota} onChange={(e) => setFilterNota(e.target.value)} className={selectCls}>
            <option value="">Todas</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrela{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        {pharmacists.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="avaliacoes-filtro-farm" className="text-xs text-muted font-medium">Farmacêutico</label>
            <select id="avaliacoes-filtro-farm" value={filterFarm} onChange={(e) => setFilterFarm(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {pharmacists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {hasAnyFilter && (
          <button
            onClick={() => { setFilterDe(''); setFilterAte(''); setFilterNota(''); setFilterFarm(''); }}
            className="inline-flex items-center gap-1 text-sm border border-line rounded-lg px-2.5 py-1.5 bg-canvas text-muted hover:bg-surface transition"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {loadingResumo || !resumo ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-canvas border border-line rounded-xl p-4 text-center">
              <p className="text-2xl font-heading font-bold text-ink">{resumo.media_geral != null ? resumo.media_geral.toFixed(1) : '—'}</p>
              {resumo.media_geral != null && <Estrelas nota={resumo.media_geral} size={16} />}
              <p className="text-xs text-muted mt-1">Média geral</p>
            </div>
            <StatMini label="Total no período" value={resumo.total} />
            <StatMini label="% notas 5" value={`${pctNota5}%`} color="text-success" />
            <StatMini label="% notas ≤ 2" value={`${pctBaixas}%`} color={pctBaixas > 0 ? 'text-error' : 'text-ink'} />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribuição por nota */}
            <div className="bg-canvas border border-line rounded-xl p-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Distribuição por nota</p>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const qtd = resumo.distribuicao[String(n)] ?? 0;
                  const pct = Math.round((qtd / maxDistribuicao) * 100);
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs text-muted w-3">{n}</span>
                      <div className="flex-1 h-2.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted w-6 text-right">{qtd}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evolução mensal (últimos 6 meses) */}
            <div className="bg-canvas border border-line rounded-xl p-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Evolução mensal (6 meses)</p>
              <div className="flex items-end gap-2 h-[100px]">
                {resumo.evolucao_mensal.map((m) => {
                  const h = m.total > 0 ? Math.max(Math.round((m.total / maxEvolucao) * 90), 4) : 2;
                  return (
                    <div key={m.mes} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                      <span className="text-[10px] text-muted font-semibold">{m.media != null ? m.media.toFixed(1) : '—'}</span>
                      <div className="w-full rounded-t-sm bg-brand" style={{ height: h }} title={`${m.total} avaliações`} />
                      <span className="text-[9px] text-muted">{m.mes.slice(5)}/{m.mes.slice(2, 4)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ranking por farmacêutico */}
          <div className="bg-canvas border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <p className="font-semibold text-ink text-sm">Ranking por farmacêutico</p>
            </div>
            {resumo.por_farmaceutico.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">Nenhuma avaliação no período.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Farmacêutico</th>
                    <th className="text-left px-4 py-2.5">Média</th>
                    <th className="text-left px-4 py-2.5">Avaliações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {resumo.por_farmaceutico.map((f) => (
                    <tr key={f.id} className={f.media < 3.5 ? 'bg-alert-wash' : ''}>
                      <td className="px-4 py-2.5 text-ink font-medium">{f.nome}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-semibold ${f.media < 3.5 ? 'text-alert' : 'text-ink'}`}>
                          {f.media.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{f.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Tabela paginada de avaliações individuais */}
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <p className="font-semibold text-ink text-sm">Avaliações</p>
          {!loading && <span className="text-xs text-muted">{total} {total === 1 ? 'registro' : 'registros'}</span>}
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Nenhuma avaliação encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data</th>
                  <th className="text-left px-4 py-3">Nota</th>
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3">Farmacêutico</th>
                  <th className="text-left px-4 py-3">Comentário</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-surface transition">
                    <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">{fmtDt(a.data)}</td>
                    <td className="px-4 py-3"><Estrelas nota={a.nota} size={13} /></td>
                    <td className="px-4 py-3 text-ink font-medium text-xs">{a.pacienteNome}</td>
                    <td className="px-4 py-3 text-ink text-xs">{a.farmaceuticoNome}</td>
                    <td className="px-4 py-3 text-muted text-xs max-w-[220px] truncate">{a.comentario || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.tipo === 'urgente' ? 'bg-error-wash text-error' : 'bg-brand-wash text-brand-deep'}`}>
                        {a.tipo === 'urgente' ? 'Urgente' : 'Agendada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewingConsulta({ id: a.consultaId, tipo: a.tipo })}
                        className="inline-flex items-center gap-1 border border-brand/40 text-brand-deep rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap hover:bg-brand-wash transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver consulta
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
