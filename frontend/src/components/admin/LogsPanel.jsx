import React, { useState, useCallback, useEffect } from 'react';
import { Download, Eye, X } from 'lucide-react';
import ConsultaModal from '../ConsultaModal';
import Paginacao from '../Paginacao';
import { ACAO_CFG, fmtDt, fmtDetalhes } from '../../utils/adminFormat';

const selectCls = 'text-sm border border-line rounded-lg px-2.5 py-1.5 outline-none bg-canvas text-ink focus:ring-2 focus:ring-brand';

// Mapeamento local para tokens — ACAO_CFG (adminFormat.js) só fornece o
// label; as cores usadas hoje (por ação) são reproduzidas aqui com classes
// em vez do style inline por hex, sem tocar no util compartilhado.
const ACAO_BADGE_CLS = {
  aceito:    'bg-brand-wash text-brand-deep',
  iniciado:  'bg-alert-wash text-alert',
  concluido: 'bg-success-wash text-success',
  cancelado: 'bg-error-wash text-error',
  devolvido: 'bg-alert-wash text-alert',
  reembolso: 'bg-pink-50 text-pink-700',
};

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
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {!loading && `${total} ${total === 1 ? 'registro' : 'registros'}`}
        </span>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-deep text-brand-contrast rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-60 transition"
        >
          <Download className="w-3.5 h-3.5" />
          {exportLoading ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-filtro-acao" className="text-xs text-muted font-medium">Ação</label>
          <select id="logs-filtro-acao" value={filterAcao} onChange={(e) => setFilterAcao(e.target.value)} className={selectCls}>
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
          <label htmlFor="logs-filtro-tipo" className="text-xs text-muted font-medium">Tipo</label>
          <select id="logs-filtro-tipo" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className={selectCls}>
            <option value="">Todos</option>
            <option value="agendada">Agendada</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        {pharmacists.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="logs-filtro-farm" className="text-xs text-muted font-medium">Farmacêutico</label>
            <select id="logs-filtro-farm" value={filterFarm} onChange={(e) => setFilterFarm(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {pharmacists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {patients.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="logs-filtro-pac" className="text-xs text-muted font-medium">Paciente</label>
            <select id="logs-filtro-pac" value={filterPac} onChange={(e) => setFilterPac(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-filtro-de" className="text-xs text-muted font-medium">De</label>
          <input id="logs-filtro-de" type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} className={selectCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-filtro-ate" className="text-xs text-muted font-medium">Até</label>
          <input id="logs-filtro-ate" type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} className={selectCls} />
        </div>
        {hasAnyFilter && (
          <button
            onClick={() => { setFilterAcao(''); setFilterDe(''); setFilterAte(''); setFilterFarm(''); setFilterPac(''); setFilterTipo(''); }}
            className="inline-flex items-center gap-1 text-sm border border-line rounded-lg px-2.5 py-1.5 bg-canvas text-muted hover:bg-surface transition"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Nenhum log encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Tempo</th>
                  <th className="text-left px-4 py-3">Detalhes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((log) => {
                  const acaoLabel = ACAO_CFG[log.acao]?.label ?? log.acao;
                  const acaoCls   = ACAO_BADGE_CLS[log.acao] ?? 'bg-surface text-muted';
                  const duracao = fmtDuracao(log.duracaoMin);
                  return (
                    <tr key={log.id} className="hover:bg-surface transition">
                      <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">
                        {fmtDt(log.criadoEm)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.pacienteNome
                          ? <span className="text-ink font-medium">{log.pacienteNome}</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-ink font-medium text-xs">{log.usuarioNome}</p>
                        <p className="text-muted text-xs">{log.role ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${acaoCls}`}>
                          {acaoLabel}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap ${duracao ? 'text-muted' : 'text-line'}`}>
                        {duracao ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">
                        {fmtDetalhes(log.acao, log.detalhes, log.consultaDataHora)}
                      </td>
                      <td className="px-4 py-3">
                        {log.consultaId && log.tipo && (
                          <button
                            onClick={() => setViewingConsulta({ id: log.consultaId, tipo: log.tipo })}
                            className="inline-flex items-center gap-1 border border-brand/40 text-brand-deep rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap hover:bg-brand-wash transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver consulta
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
