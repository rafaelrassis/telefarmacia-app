import React, { useState, useCallback, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import ConsultaModal from '../ConsultaModal';
import Paginacao from '../Paginacao';
import { fmtDt } from '../../utils/adminFormat';

// ── Aba "Consultas" (fila agendada + urgente) ────────────────────────────────

export const CONSULTA_STATUS_CFG = {
  aguardando:           { label: 'Aguardando',   cls: 'bg-surface text-muted' },
  aceito:               { label: 'Aceito',       cls: 'bg-brand-wash text-brand-deep' },
  em_atendimento:       { label: 'Em atendimento', cls: 'bg-success-wash text-success' },
  concluido:            { label: 'Concluído',    cls: 'bg-teal-50 text-teal-700' },
  cancelado:            { label: 'Cancelado',    cls: 'bg-error-wash text-error' },
  expirado:             { label: 'Expirado',     cls: 'bg-surface text-muted' },
  remarcacao_pendente:  { label: 'Remarcação pendente', cls: 'bg-alert-wash text-alert' },
};

const selectCls = 'text-sm border border-line rounded-lg px-2.5 py-1.5 outline-none bg-canvas text-ink focus:ring-2 focus:ring-brand';

const ConsultasTab = ({ api }) => {
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo]     = useState('todas');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDe, setFilterDe]         = useState('');
  const [filterAte, setFilterAte]       = useState('');
  const [filterQ, setFilterQ]           = useState('');
  const [filterExpirada, setFilterExpirada] = useState(false);
  const [viewingConsulta, setViewingConsulta] = useState(null);

  const LIMIT = 20;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const buildParams = useCallback((pg) => {
    const p = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
    if (filterTipo !== 'todas') p.set('tipo', filterTipo);
    if (filterStatus)           p.set('status', filterStatus);
    if (filterDe)               p.set('de', filterDe);
    if (filterAte)               p.set('ate', filterAte);
    if (filterQ.trim())         p.set('q', filterQ.trim());
    if (filterExpirada)         p.set('expirada', 'true');
    return p;
  }, [filterTipo, filterStatus, filterDe, filterAte, filterQ, filterExpirada]);

  const fetchConsultas = useCallback(async (pg) => {
    setLoading(true);
    try {
      const res = await api(`/api/admin/consultas?${buildParams(pg)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [api, buildParams]);

  useEffect(() => { setPage(1); fetchConsultas(1); }, [fetchConsultas]);

  const goPage = (pg) => { setPage(pg); fetchConsultas(pg); };

  const hasAnyFilter = filterTipo !== 'todas' || filterStatus || filterDe || filterAte || filterQ;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="consultas-filtro-tipo" className="text-xs text-muted font-medium">Tipo</label>
          <select id="consultas-filtro-tipo" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className={selectCls}>
            <option value="todas">Todas</option>
            <option value="agendada">Agendada</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="consultas-filtro-status" className="text-xs text-muted font-medium">Status</label>
          <select id="consultas-filtro-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="">Todos</option>
            {Object.entries(CONSULTA_STATUS_CFG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="consultas-filtro-de" className="text-xs text-muted font-medium">De</label>
          <input id="consultas-filtro-de" type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} className={selectCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="consultas-filtro-ate" className="text-xs text-muted font-medium">Até</label>
          <input id="consultas-filtro-ate" type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} className={selectCls} />
        </div>
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label htmlFor="consultas-filtro-q" className="text-xs text-muted font-medium">Buscar (nome/e-mail)</label>
          <input
            id="consultas-filtro-q"
            type="text" value={filterQ} onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Paciente ou farmacêutico" className={selectCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted font-medium">&nbsp;</span>
          <label className="flex items-center gap-2 text-xs text-ink font-medium h-[38px]">
            <input
              type="checkbox" checked={filterExpirada}
              onChange={(e) => setFilterExpirada(e.target.checked)}
              className="accent-brand"
            />
            Só expiradas
          </label>
        </div>
        {(hasAnyFilter || filterExpirada) && (
          <button
            onClick={() => { setFilterTipo('todas'); setFilterStatus(''); setFilterDe(''); setFilterAte(''); setFilterQ(''); setFilterExpirada(false); }}
            className="inline-flex items-center gap-1 text-sm border border-line rounded-lg px-2.5 py-1.5 bg-canvas text-muted hover:bg-surface transition"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
        {!loading && (
          <span className="text-xs text-muted self-end mb-1.5">
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Nenhuma consulta encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3">Farmacêutico</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Motivo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c) => {
                  const cfg = CONSULTA_STATUS_CFG[c.status] ?? { label: c.status, cls: 'bg-surface text-muted' };
                  return (
                    <tr key={`${c.tipo}-${c.id}`} className="hover:bg-surface transition">
                      <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">{fmtDt(c.dataHora)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.tipo === 'urgente' ? 'bg-error-wash text-error' : 'bg-brand-wash text-brand-deep'}`}>
                          {c.tipo === 'urgente' ? 'Urgente' : 'Agendada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-ink font-medium">{c.paciente?.name ?? '—'}</p>
                        <p className="text-muted">{c.paciente?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-ink">{c.farmaceutico?.name ?? '—'}</p>
                        <p className="text-muted">{c.farmaceutico?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted max-w-[200px] truncate">{c.motivo || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewingConsulta({ id: c.id, tipo: c.tipo })}
                          className="inline-flex items-center gap-1 border border-brand/40 text-brand-deep rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap hover:bg-brand-wash transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver consulta
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && <Paginacao page={page} totalPages={totalPages} onPageChange={goPage} />}

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

export default ConsultasTab;
