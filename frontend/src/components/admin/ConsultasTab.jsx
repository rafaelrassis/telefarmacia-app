import React, { useState, useCallback, useEffect } from 'react';
import ConsultaModal from '../ConsultaModal';
import Paginacao from '../Paginacao';
import { fmtDt, SEL_STYLE } from '../../utils/adminFormat';

// ── Aba "Consultas" (fila agendada + urgente) ────────────────────────────────

export const CONSULTA_STATUS_CFG = {
  aguardando:           { label: 'Aguardando',   cls: 'bg-gray-100 text-gray-600' },
  aceito:               { label: 'Aceito',       cls: 'bg-blue-50 text-blue-700' },
  em_atendimento:       { label: 'Em atendimento', cls: 'bg-green-50 text-green-700' },
  concluido:            { label: 'Concluído',    cls: 'bg-violet-50 text-violet-700' },
  cancelado:            { label: 'Cancelado',    cls: 'bg-red-50 text-red-700' },
  expirado:             { label: 'Expirado',     cls: 'bg-gray-100 text-gray-500' },
  remarcacao_pendente:  { label: 'Remarcação pendente', cls: 'bg-amber-50 text-amber-700' },
};

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
          <label className="text-xs text-gray-500 font-medium">Tipo</label>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} style={SEL_STYLE}>
            <option value="todas">Todas</option>
            <option value="agendada">Agendada</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={SEL_STYLE}>
            <option value="">Todos</option>
            {Object.entries(CONSULTA_STATUS_CFG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">De</label>
          <input type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} style={SEL_STYLE} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Até</label>
          <input type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} style={SEL_STYLE} />
        </div>
        <div className="flex flex-col gap-1" style={{ minWidth: 200 }}>
          <label className="text-xs text-gray-500 font-medium">Buscar (nome/e-mail)</label>
          <input
            type="text" value={filterQ} onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Paciente ou farmacêutico" style={SEL_STYLE}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">&nbsp;</label>
          <label className="flex items-center gap-2 text-xs text-gray-600 font-medium" style={{ height: 38 }}>
            <input
              type="checkbox" checked={filterExpirada}
              onChange={(e) => setFilterExpirada(e.target.checked)}
            />
            Só expiradas
          </label>
        </div>
        {(hasAnyFilter || filterExpirada) && (
          <button
            onClick={() => { setFilterTipo('todas'); setFilterStatus(''); setFilterDe(''); setFilterAte(''); setFilterQ(''); setFilterExpirada(false); }}
            style={{ ...SEL_STYLE, background: '#fff', color: '#6b7280', cursor: 'pointer' }}
          >
            Limpar filtros
          </button>
        )}
        {!loading && (
          <span className="text-xs text-gray-400 self-end mb-1.5">
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhuma consulta encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3">Farmacêutico</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Motivo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => {
                  const cfg = CONSULTA_STATUS_CFG[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={`${c.tipo}-${c.id}`} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDt(c.dataHora)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.tipo === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>
                          {c.tipo === 'urgente' ? 'Urgente' : 'Agendada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-gray-800 font-medium">{c.paciente?.name ?? '—'}</p>
                        <p className="text-gray-400">{c.paciente?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-gray-700">{c.farmaceutico?.name ?? '—'}</p>
                        <p className="text-gray-400">{c.farmaceutico?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{c.motivo || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewingConsulta({ id: c.id, tipo: c.tipo })}
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
