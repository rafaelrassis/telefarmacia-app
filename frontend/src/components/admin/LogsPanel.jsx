import React, { useState, useCallback, useEffect } from 'react';
import ConsultaModal from '../ConsultaModal';
import Paginacao from '../Paginacao';
import { ACAO_CFG, fmtDt, fmtDetalhes, SEL_STYLE } from '../../utils/adminFormat';

const LogsPanel = ({ api, pharmacists = [], patients = [] }) => {
  const [logs, setLogs]                   = useState([]);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [loading, setLoading]             = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterAcao, setFilterAcao]       = useState('');
  const [filterDe, setFilterDe]           = useState('');
  const [filterAte, setFilterAte]         = useState('');
  const [filterFarm, setFilterFarm]       = useState('');
  const [filterPac, setFilterPac]         = useState('');
  const [filterTipo, setFilterTipo]       = useState('');
  const [viewingConsulta, setViewingConsulta] = useState(null);

  const LIMIT = 20;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const buildParams = useCallback((pg, forExport = false) => {
    const p = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
    if (forExport)   p.set('export', 'csv');
    if (filterAcao)  p.set('acao',           filterAcao);
    if (filterDe)    p.set('de',             filterDe);
    if (filterAte)   p.set('ate',            filterAte);
    if (filterFarm)  p.set('farmaceuticoId', filterFarm);
    if (filterPac)   p.set('pacienteId',     filterPac);
    if (filterTipo)  p.set('tipo',           filterTipo);
    return p;
  }, [filterAcao, filterDe, filterAte, filterFarm, filterPac, filterTipo]);

  const fetchLogs = useCallback(async (pg) => {
    setLoading(true);
    try {
      const res = await api(`/api/admin/logs?${buildParams(pg)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [api, buildParams]);

  useEffect(() => { setPage(1); fetchLogs(1); }, [fetchLogs]);

  const goPage = (pg) => { setPage(pg); fetchLogs(pg); };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await api(`/api/admin/logs?${buildParams(1, true)}`);
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (_) {}
    finally { setExportLoading(false); }
  };

  const fmtDuracao = (min) => {
    if (min == null) return null;
    if (min < 60)   return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const hasAnyFilter = filterAcao || filterDe || filterAte || filterFarm || filterPac || filterTipo;

  return (
    <div className="space-y-4">

      {/* Header: contador + exportar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {!loading && `${total} ${total === 1 ? 'registro' : 'registros'}`}
        </span>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          style={{
            background: '#7c3aed', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 16px', fontSize: 13,
            fontWeight: 600, cursor: exportLoading ? 'not-allowed' : 'pointer',
            opacity: exportLoading ? 0.6 : 1,
          }}
        >
          {exportLoading ? 'Exportando…' : '📥 Exportar CSV'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Ação</label>
          <select value={filterAcao} onChange={(e) => setFilterAcao(e.target.value)} style={SEL_STYLE}>
            <option value="">Todas</option>
            <option value="aceito">Aceito</option>
            <option value="iniciado">Iniciado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
            <option value="devolvido">Devolvido</option>
            <option value="reembolso">Reembolso</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Tipo</label>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} style={SEL_STYLE}>
            <option value="">Todos</option>
            <option value="agendada">Agendada</option>
            <option value="urgente">Urgente</option>
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
        {patients.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Paciente</label>
            <select value={filterPac} onChange={(e) => setFilterPac(e.target.value)} style={SEL_STYLE}>
              <option value="">Todos</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">De</label>
          <input type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} style={SEL_STYLE} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Até</label>
          <input type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} style={SEL_STYLE} />
        </div>
        {hasAnyFilter && (
          <button
            onClick={() => { setFilterAcao(''); setFilterDe(''); setFilterAte(''); setFilterFarm(''); setFilterPac(''); setFilterTipo(''); }}
            style={{ ...SEL_STYLE, background: '#fff', color: '#6b7280', cursor: 'pointer' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhum log encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Tempo</th>
                  <th className="text-left px-4 py-3">Detalhes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const acaoCfg = ACAO_CFG[log.acao] || { label: log.acao, style: { background: '#f3f4f6', color: '#6b7280' } };
                  const duracao = fmtDuracao(log.duracaoMin);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {fmtDt(log.criadoEm)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.pacienteNome
                          ? <span className="text-gray-800 font-medium">{log.pacienteNome}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-medium text-xs">{log.usuarioNome}</p>
                        <p className="text-gray-400 text-xs">{log.role ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 8px', borderRadius: 9999,
                          fontSize: 11, fontWeight: 600,
                          ...acaoCfg.style,
                        }}>
                          {acaoCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: duracao ? '#6b7280' : '#d1d5db' }}>
                        {duracao ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {fmtDetalhes(log.acao, log.detalhes, log.consultaDataHora)}
                      </td>
                      <td className="px-4 py-3">
                        {log.consultaId && log.tipo && (
                          <button
                            onClick={() => setViewingConsulta({ id: log.consultaId, tipo: log.tipo })}
                            style={{
                              background: 'transparent', border: '1.5px solid #ddd6fe',
                              color: '#7c3aed', borderRadius: 8, padding: '4px 10px',
                              fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            👁 Ver consulta
                          </button>
                        )}
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

      {/* Modal de visualização */}
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

export default LogsPanel;
