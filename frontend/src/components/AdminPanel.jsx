import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ConsultaModal from './ConsultaModal';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const DEFAULT_HORARIOS = DIAS_SEMANA.map((_, i) => ({
  diaSemana: i,
  horaInicio: '08:00',
  horaFim: '18:00',
  ativo: i >= 1 && i <= 5,
}));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_LABEL = {
  AGENDADO:           { label: 'Agendado',           cls: 'bg-blue-50 text-blue-700' },
  CONCLUIDO:          { label: 'Concluído',           cls: 'bg-green-50 text-green-700' },
  CANCELADO:          { label: 'Cancelado',           cls: 'bg-red-50 text-red-700' },
  PENDENTE_PAGAMENTO: { label: 'Pend. pagamento',     cls: 'bg-yellow-50 text-yellow-700' },
  EXPIRADA:           { label: 'Expirada',            cls: 'bg-gray-100 text-gray-500' },
};

const fmt   = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const fmtDt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const StatCard = ({ value, label, sub, color = 'text-gray-900' }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// ── Configs de ação para a aba Logs ──────────────────────────────────────────

const ACAO_CFG = {
  aceito:    { label: 'Aceito',    style: { background: '#eff6ff', color: '#1d4ed8' } },
  iniciado:  { label: 'Iniciado',  style: { background: '#fff7ed', color: '#c2410c' } },
  concluido: { label: 'Concluído', style: { background: '#f0fdf4', color: '#15803d' } },
  cancelado: { label: 'Cancelado', style: { background: '#fef2f2', color: '#dc2626' } },
  devolvido: { label: 'Devolvido', style: { background: '#fffbeb', color: '#b45309' } },
  reembolso: { label: 'Reembolso', style: { background: '#faf5ff', color: '#7c3aed' } },
};

const fmtConsultaDt = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} às ${hh}:${min}`;
};

const fmtDetalhes = (acao, det, consultaDataHora) => {
  const dtStr = consultaDataHora ? ` · ${fmtConsultaDt(consultaDataHora)}` : '';
  if (!det || Object.keys(det).length === 0) return dtStr.trim() || '—';
  if (acao === 'aceito')    return `Tipo: ${det.tipo ?? '—'}${dtStr}`;
  if (acao === 'iniciado')  return `${det.tipo ? `Tipo: ${det.tipo}` : '—'}${dtStr}`;
  if (acao === 'concluido') return `${det.duracao_min != null ? `Duração: ${det.duracao_min}min` : 'Duração: —'}${dtStr}`;
  if (acao === 'cancelado') return `Por: ${det.cancelado_por ?? '?'}${det.motivo ? `, motivo: ${det.motivo}` : ''}${dtStr}`;
  if (acao === 'devolvido') return `${det.motivo ? `Motivo: ${det.motivo}` : '—'}${dtStr}`;
  if (acao === 'reembolso') return `${det.valor != null ? `R$ ${Number(det.valor).toFixed(2).replace('.', ',')}` : '—'}${dtStr}`;
  return JSON.stringify(det).substring(0, 80);
};

const SEL_STYLE = {
  fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '6px 10px', outline: 'none', background: '#fff',
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
        setLogs(data.items ?? []);
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

  const getPageNums = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, page]);
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) pages.add(i);
    return [...pages].sort((a, b) => a - b);
  };

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

      {/* Paginação numérica */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, paddingTop: 4 }}>
          <button
            onClick={() => goPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: '5px 10px', fontSize: 12, fontWeight: 500,
              border: '1px solid #e5e7eb', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer',
              background: '#fff', color: '#6b7280', opacity: page === 1 ? 0.4 : 1,
            }}
          >←</button>
          {getPageNums().map((n, i, arr) => (
            <React.Fragment key={n}>
              {i > 0 && arr[i - 1] !== n - 1 && (
                <span style={{ color: '#d1d5db', fontSize: 12, padding: '0 2px' }}>…</span>
              )}
              <button
                onClick={() => goPage(n)}
                style={{
                  padding: '5px 10px', fontSize: 12, fontWeight: 600,
                  border: n === page ? 'none' : '1px solid #e5e7eb',
                  borderRadius: 8, cursor: 'pointer',
                  background: n === page ? '#7c3aed' : '#fff',
                  color: n === page ? '#fff' : '#374151',
                }}
              >{n}</button>
            </React.Fragment>
          ))}
          <button
            onClick={() => goPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            style={{
              padding: '5px 10px', fontSize: 12, fontWeight: 500,
              border: '1px solid #e5e7eb', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer',
              background: '#fff', color: '#6b7280', opacity: page === totalPages ? 0.4 : 1,
            }}
          >→</button>
        </div>
      )}

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

// ─────────────────────────────────────────────────────────────────────────────

const AdminPanel = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState('overview');
  const [metricas, setMetricas]       = useState(null);
  const [pharmacists, setPharmacists] = useState([]);
  const [patients, setPatients]       = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [toast, setToast] = useState(null);
  const [sistemaAberto, setSistemaAberto] = useState(null);
  const [togglingSistema, setTogglingSistema] = useState(false);
  const [horarios, setHorarios] = useState(DEFAULT_HORARIOS);
  const [savingHorarios, setSavingHorarios] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  // Financeiro
  const [finConfig, setFinConfig]           = useState(null);
  const [finVisao, setFinVisao]             = useState(null);
  const [finLoading, setFinLoading]         = useState(false);
  const [finVisaoLoading, setFinVisaoLoading] = useState(false);
  const [finPreco, setFinPreco]             = useState('');
  const [finComissao, setFinComissao]       = useState('');
  const [finSaving, setFinSaving]           = useState(false);
  const [finPeriodoDe, setFinPeriodoDe]     = useState('');
  const [finPeriodoAte, setFinPeriodoAte]   = useState('');
  const [editingComissao, setEditingComissao] = useState({});
  const [savingComissao, setSavingComissao] = useState({});

  // Parceiros (Onde Comprar)
  const [parceiros,          setParceiros]          = useState([]);
  const [parceirosLoading,   setParceirosLoading]   = useState(false);
  const [ondeComprarAtivo,   setOndeComprarAtivo]   = useState(false);
  const [togglingOC,         setTogglingOC]         = useState(false);
  const [metricasParceiros,  setMetricasParceiros]  = useState([]);
  const [parceirosForm,      setParceirosForm]      = useState(null);
  const [parceirosFormErr,   setParceirosFormErr]   = useState('');
  const [savingParceiro,     setSavingParceiro]     = useState(false);
  const [confirmDelParceiro, setConfirmDelParceiro] = useState(null);

  // Repasses
  const [repasseFarmId,       setRepasseFarmId]       = useState('');
  const [repasseDe,           setRepasseDe]           = useState('');
  const [repasseAte,          setRepasseAte]          = useState('');
  const [repassePreview,      setRepassePreview]       = useState(null);
  const [repassePreviewErr,   setRepassePreviewErr]   = useState('');
  const [repasseLoading,      setRepasseLoading]      = useState(false);
  const [repasseRef,          setRepasseRef]          = useState('');
  const [repasseConfirming,   setRepasseConfirming]   = useState(false);
  const [repasseHistorico,    setRepasseHistorico]    = useState([]);
  const [repasseHistLoading,  setRepasseHistLoading]  = useState(false);
  const [repasseExpanded,     setRepasseExpanded]     = useState({});

  // Convites de farmacêuticos
  const [convites,        setConvites]        = useState([]);
  const [convitesLoading, setConvitesLoading] = useState(false);
  const [conviteForm,     setConviteForm]     = useState(null); // null | {}
  const [conviteNome,     setConviteNome]     = useState('');
  const [conviteEmail,    setConviteEmail]    = useState('');
  const [conviteErr,      setConviteErr]      = useState('');
  const [savingConvite,   setSavingConvite]   = useState(false);
  const [conviteLink,     setConviteLink]     = useState(null);

  // Suspender farmacêutico
  const [confirmSuspend,  setConfirmSuspend]  = useState(null);
  const [suspendLoading,  setSuspendLoading]  = useState(false);

  const api = useCallback(
    (path, opts = {}) =>
      fetch(`${API_URL}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
      }),
    [token]
  );

  const load = useCallback(async () => {
    const [mRes, pRes, patRes, aRes, sRes, hRes] = await Promise.all([
      api('/api/admin/metricas'),
      api('/api/admin/pharmacists'),
      api('/api/admin/patients'),
      api('/api/admin/appointments'),
      fetch(`${API_URL}/api/sistema/status`),
      api('/api/admin/horarios'),
    ]);
    if (mRes.ok)   setMetricas(await mRes.json());
    if (pRes.ok)   setPharmacists(await pRes.json());
    if (patRes.ok) setPatients(await patRes.json());
    if (aRes.ok)   setAppointments(await aRes.json());
    if (sRes.ok)   { const sd = await sRes.json(); setSistemaAberto(sd.sistema_aberto); }
    if (hRes.ok) {
      const h = await hRes.json();
      if (h.length > 0) {
        // Mescla com defaults para garantir os 7 dias
        setHorarios(DEFAULT_HORARIOS.map((def) => {
          const saved = h.find((x) => x.diaSemana === def.diaSemana);
          return saved ? { ...def, ...saved } : def;
        }));
      }
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const loadFinanceiro = useCallback(async (de, ate) => {
    setFinLoading(true);
    try {
      const res = await api('/api/admin/config/financeiro');
      if (res.ok) {
        const d = await res.json();
        setFinConfig(d);
        setFinPreco(String(d.preco));
        setFinComissao(String(d.comissaoPadrao));
      }
    } finally { setFinLoading(false); }
  }, [api]);

  const loadVisaoFinanceira = useCallback(async (de, ate) => {
    setFinVisaoLoading(true);
    try {
      const params = new URLSearchParams();
      if (de)  params.set('de',  de);
      if (ate) params.set('ate', ate);
      const res = await api(`/api/admin/financeiro?${params}`);
      if (res.ok) setFinVisao(await res.json());
    } finally { setFinVisaoLoading(false); }
  }, [api]);

  useEffect(() => {
    if (tab === 'financeiro') {
      loadFinanceiro();
      loadVisaoFinanceira(finPeriodoDe, finPeriodoAte);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const setBtnLoading = (key, v) => setActionLoading((prev) => ({ ...prev, [key]: v }));

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const activate = async (userId) => {
    setBtnLoading(userId, true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: 'Ativo' }),
      });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: true } } : p
        ));
        showToast('success', data.message || 'Farmacêutico ativado.');
      } else {
        showToast('error', data.error || 'Erro ao ativar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setBtnLoading(userId, false); }
  };

  const revokeConfirmed = async (userId) => {
    setBtnLoading(userId + '_rev', true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: 'Inativo' }),
      });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: false } } : p
        ));
        showToast('success', data.message || 'Farmacêutico inativado.');
      } else {
        showToast('error', data.error || 'Erro ao inativar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setBtnLoading(userId + '_rev', false); setConfirmRevoke(null); }
  };

  const handleToggleSistema = async () => {
    setTogglingSistema(true);
    try {
      const res  = await api('/api/admin/sistema', {
        method: 'PATCH', body: JSON.stringify({ aberto: !sistemaAberto }),
      });
      const data = await res.json();
      if (res.ok) {
        setSistemaAberto(data.sistema_aberto);
        showToast('success', data.sistema_aberto ? 'Sistema aberto para agendamentos.' : 'Sistema fechado.');
      } else {
        showToast('error', data.error || 'Erro ao alterar status do sistema.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setTogglingSistema(false); }
  };

  const deleteFarm = async (userId) => {
    setBtnLoading(userId + '_del', true);
    try {
      const res  = await api(`/api/admin/pharmacists/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.filter((p) => p.id !== userId));
        showToast('success', data.message || 'Farmacêutico descadastrado.');
      } else {
        showToast('error', data.error || 'Erro ao descadastrar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setBtnLoading(userId + '_del', false); setConfirmDelete(null); }
  };

  const handleSaveHorarios = async () => {
    setSavingHorarios(true);
    try {
      const res  = await api('/api/admin/horarios', {
        method: 'PUT', body: JSON.stringify({ horarios }),
      });
      const data = await res.json();
      if (res.ok) {
        setUltimaAtualizacao(data.ultima_atualizacao ?? new Date().toISOString());
      } else {
        showToast('error', data.error || 'Erro ao salvar horários.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setSavingHorarios(false); }
  };

  const updateHorario = (diaSemana, field, value) => {
    setHorarios((prev) =>
      prev.map((h) => h.diaSemana === diaSemana ? { ...h, [field]: value } : h)
    );
  };

  // ── Parceiros: carregamento ───────────────────────────────────────────────
  const loadParceiros = useCallback(async () => {
    setParceirosLoading(true);
    try {
      const [pRes, ocRes, mRes] = await Promise.all([
        api('/api/admin/parceiros'),
        api('/api/admin/config/onde-comprar'),
        api('/api/admin/parceiros/metricas'),
      ]);
      if (pRes.ok)  setParceiros(await pRes.json());
      if (ocRes.ok) { const d = await ocRes.json(); setOndeComprarAtivo(d.ativo ?? false); }
      if (mRes.ok)  { const d = await mRes.json(); setMetricasParceiros(d.parceiros ?? []); }
    } catch {}
    finally { setParceirosLoading(false); }
  }, [api]);

  useEffect(() => { if (tab === 'parceiros') loadParceiros(); }, [tab, loadParceiros]);

  // ── Repasses ─────────────────────────────────────────────────────────────────
  const loadRepasseHistorico = useCallback(async (farmId) => {
    setRepasseHistLoading(true);
    try {
      const params = new URLSearchParams();
      if (farmId) params.set('pharmacistId', farmId);
      const res = await api(`/api/admin/repasses?${params}`);
      if (res.ok) setRepasseHistorico((await res.json()).items ?? []);
    } catch {}
    finally { setRepasseHistLoading(false); }
  }, [api]);

  useEffect(() => {
    if (tab === 'repasses') loadRepasseHistorico(repasseFarmId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handlePreviewRepasse = async () => {
    if (!repasseFarmId || !repasseDe || !repasseAte) {
      setRepassePreviewErr('Selecione farmacêutico e período.');
      return;
    }
    setRepasseLoading(true);
    setRepassePreviewErr('');
    setRepassePreview(null);
    try {
      const params = new URLSearchParams({ pharmacistId: repasseFarmId, de: repasseDe, ate: repasseAte });
      const res = await api(`/api/admin/repasses/preview?${params}`);
      const d   = await res.json();
      if (res.ok) { setRepassePreview(d); setRepasseRef(''); }
      else setRepassePreviewErr(d.error || 'Erro ao carregar prévia.');
    } catch { setRepassePreviewErr('Falha de conexão.'); }
    finally { setRepasseLoading(false); }
  };

  const handleConfirmarRepasse = async () => {
    if (!repassePreview) return;
    setRepasseConfirming(true);
    try {
      const res  = await api('/api/admin/repasses', {
        method: 'POST',
        body: JSON.stringify({ pharmacistId: repasseFarmId, de: repasseDe, ate: repasseAte, referenciaTransacao: repasseRef }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast('success', `Repasse de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.valorTotal)} registrado.`);
        setRepassePreview(null);
        loadRepasseHistorico(repasseFarmId);
      } else {
        showToast('error', d.error || 'Erro ao registrar repasse.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setRepasseConfirming(false); }
  };

  // ── Convites ──────────────────────────────────────────────────────────────────
  const loadConvites = useCallback(async () => {
    setConvitesLoading(true);
    try {
      const res = await api('/api/admin/convites');
      if (res.ok) setConvites(await res.json());
    } catch {}
    finally { setConvitesLoading(false); }
  }, [api]);

  useEffect(() => {
    if (tab === 'convites') loadConvites();
  }, [tab, loadConvites]);

  const handleCriarConvite = async (e) => {
    e.preventDefault();
    if (!conviteNome.trim() || !conviteEmail.trim()) { setConviteErr('Nome e e-mail são obrigatórios.'); return; }
    setSavingConvite(true);
    setConviteErr('');
    try {
      const res = await api('/api/admin/convites', {
        method: 'POST',
        body: JSON.stringify({ nome: conviteNome.trim(), email: conviteEmail.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setConviteLink(d.link);
        setConvites((prev) => [d.convite, ...prev]);
        setConviteNome('');
        setConviteEmail('');
      } else {
        setConviteErr(d.error || 'Erro ao criar convite.');
      }
    } catch { setConviteErr('Falha de conexão.'); }
    finally { setSavingConvite(false); }
  };

  const handleRevogarConvite = async (id) => {
    try {
      const res = await api(`/api/admin/convites/${id}`, { method: 'DELETE' });
      if (res.ok) setConvites((prev) => prev.filter((c) => c.id !== id));
      else { const d = await res.json(); showToast('error', d.error || 'Erro ao revogar.'); }
    } catch { showToast('error', 'Falha de conexão.'); }
  };

  // ── Suspender / Reativar ──────────────────────────────────────────────────────
  const handleSuspender = async (userId) => {
    setSuspendLoading(true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/suspender`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId
            ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: false, isSuspended: true } }
            : p
        ));
        showToast('success', data.message || 'Farmacêutico suspenso.');
      } else {
        showToast('error', data.error || 'Erro ao suspender.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setSuspendLoading(false); setConfirmSuspend(null); }
  };

  const handleReativar = async (userId) => {
    setBtnLoading(userId + '_reat', true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/reativar`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId
            ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: true, isSuspended: false } }
            : p
        ));
        showToast('success', data.message || 'Farmacêutico reativado.');
      } else {
        showToast('error', data.error || 'Erro ao reativar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setBtnLoading(userId + '_reat', false); }
  };

  const handleToggleOC = async () => {
    setTogglingOC(true);
    try {
      const novoValor = !ondeComprarAtivo;
      const res = await api('/api/admin/config/onde-comprar', {
        method: 'PATCH', body: JSON.stringify({ ativo: novoValor }),
      });
      if (res.ok) setOndeComprarAtivo(novoValor);
      else showToast('error', 'Falha ao alterar configuração.');
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setTogglingOC(false); }
  };

  const handleSaveParceiro = async () => {
    setParceirosFormErr('');
    if (!parceirosForm?.nome?.trim())          { setParceirosFormErr('Nome é obrigatório.'); return; }
    if (!parceirosForm?.baseUrl?.trim())       { setParceirosFormErr('URL base é obrigatória.'); return; }
    if (!parceirosForm?.affiliateCode?.trim()) { setParceirosFormErr('Código de afiliado é obrigatório.'); return; }
    setSavingParceiro(true);
    try {
      const isEdit = Boolean(parceirosForm.id);
      const res = await api(
        isEdit ? `/api/admin/parceiros/${parceirosForm.id}` : '/api/admin/parceiros',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(parceirosForm) }
      );
      if (res.ok) {
        setParceirosForm(null);
        loadParceiros();
      } else {
        const d = await res.json().catch(() => ({}));
        setParceirosFormErr(d.error || 'Erro ao salvar.');
      }
    } catch { setParceirosFormErr('Falha de conexão.'); }
    finally  { setSavingParceiro(false); }
  };

  const handleDeleteParceiro = async (id) => {
    try {
      const res = await api(`/api/admin/parceiros/${id}`, { method: 'DELETE' });
      if (res.ok) { setConfirmDelParceiro(null); loadParceiros(); }
      else showToast('error', 'Falha ao excluir parceiro.');
    } catch { showToast('error', 'Falha de conexão.'); }
  };

  const TABS = [
    { id: 'overview',     label: 'Visão geral' },
    { id: 'horarios',     label: 'Horários' },
    { id: 'pharmacists',  label: `Farmacêuticos (${pharmacists.length})` },
    { id: 'patients',     label: `Pacientes (${patients.length})` },
    { id: 'logs',         label: 'Logs' },
    { id: 'financeiro',   label: '💰 Financeiro' },
    { id: 'repasses',     label: '💳 Repasses' },
    { id: 'convites',     label: '✉️ Convites' },
    { id: 'parceiros',    label: '🤝 Parceiros' },
  ];

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
              tab === t.id
                ? 'border-violet-700 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Sistema de agendamentos */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Sistema de Agendamentos</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {sistemaAberto === null
                  ? 'Carregando status...'
                  : sistemaAberto
                    ? 'Aberto — pacientes podem realizar agendamentos.'
                    : 'Fechado — agendamentos estão suspensos para todos os pacientes.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold ${sistemaAberto ? 'text-emerald-600' : 'text-red-500'}`}>
                {togglingSistema ? '...' : sistemaAberto ? 'Aberto' : 'Fechado'}
              </span>
              <button
                onClick={handleToggleSistema}
                disabled={sistemaAberto === null || togglingSistema}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  sistemaAberto ? 'bg-emerald-500' : 'bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    sistemaAberto ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {metricas ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard value={metricas.usuarios_ativos?.pacientes}     label="Pacientes"             color="text-blue-600" />
                <StatCard value={metricas.usuarios_ativos?.farmaceuticos} label="Farmacêuticos ativos"  color="text-violet-600" />
                <StatCard value={metricas.consultas_realizadas}           label="Consultas realizadas"  color="text-green-600" />
                <StatCard value={metricas.consultas_agendadas}            label="Agendadas"             color="text-blue-500" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard value={metricas.consultas_canceladas}    label="Canceladas"               color="text-red-500" />
                <StatCard
                  value={metricas.farmaceuticos_pendentes}
                  label="Aguardando aprovação"
                  color={metricas.farmaceuticos_pendentes > 0 ? 'text-amber-600' : 'text-gray-400'}
                  sub={metricas.farmaceuticos_pendentes > 0 ? 'Vá em Farmacêuticos para aprovar' : undefined}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                  <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-24" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HORÁRIOS DO SISTEMA ── */}
      {tab === 'horarios' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Horários de funcionamento</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Define os dias e horários em que os pacientes podem agendar consultas.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {horarios.map((h) => (
                <div key={h.diaSemana} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium text-gray-700">{DIAS_SEMANA[h.diaSemana]}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <div
                      onClick={() => updateHorario(h.diaSemana, 'ativo', !h.ativo)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                        h.ativo ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        h.ativo ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className={`text-xs font-medium ${h.ativo ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {h.ativo ? 'Ativo' : 'Fechado'}
                    </span>
                  </label>
                  {h.ativo && (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={h.horaInicio}
                        onChange={(e) => updateHorario(h.diaSemana, 'horaInicio', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <span className="text-gray-400 text-xs">até</span>
                      <input
                        type="time"
                        value={h.horaFim}
                        onChange={(e) => updateHorario(h.diaSemana, 'horaFim', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex flex-col items-end gap-2">
              <button
                onClick={handleSaveHorarios}
                disabled={savingHorarios}
                className="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {savingHorarios ? 'Salvando...' : '💾 Salvar e Publicar Horários'}
              </button>
              {ultimaAtualizacao && !savingHorarios && (
                <p className="text-xs text-green-600 font-medium">
                  ✅ Publicado em {new Date(ultimaAtualizacao).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    timeZone: 'America/Sao_Paulo',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FARMACÊUTICOS ── */}
      {tab === 'pharmacists' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {pharmacists.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhum farmacêutico cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nome / E-mail</th>
                    <th className="text-left px-4 py-3">CRF</th>
                    <th className="text-left px-4 py-3">Documentos</th>
                    <th className="text-left px-4 py-3">Consultas</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pharmacists.map((p) => {
                    const prof       = p.pharmacistProfile;
                    const approved   = prof?.isApproved;
                    const suspended  = prof?.isSuspended;
                    const docBase    = API_URL;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {prof ? `${prof.crfNumber}/${prof.crfUF}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {prof?.urlDocIdentidade ? (
                            <div className="flex flex-col gap-1">
                              <a href={`${docBase}${prof.urlDocIdentidade}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-violet-600 hover:underline">RG/CNH</a>
                              <a href={`${docBase}${prof.urlDocCrf}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-violet-600 hover:underline">CRF</a>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Não enviado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {p._count?.appointmentsAsPharmacist ?? 0}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            suspended  ? 'bg-red-50 text-red-700'
                            : approved ? 'bg-green-50 text-green-700'
                                       : 'bg-amber-50 text-amber-700'
                          }`}>
                            {suspended ? '🔴 Suspenso' : approved ? 'Ativo' : 'Pendente'}
                          </span>
                          {prof?.chavePix && (
                            <p className="text-[10px] text-gray-400 mt-1">PIX: {prof.chavePix}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {suspended ? (
                              <button
                                onClick={() => handleReativar(p.id)}
                                disabled={actionLoading[p.id + '_reat']}
                                className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                              >
                                {actionLoading[p.id + '_reat'] ? '...' : 'Reativar'}
                              </button>
                            ) : approved ? (
                              <>
                                <button
                                  onClick={() => setConfirmSuspend(p)}
                                  className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition"
                                >
                                  Suspender
                                </button>
                                <button
                                  onClick={() => setConfirmRevoke(p)}
                                  disabled={actionLoading[p.id + '_rev']}
                                  className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                                >
                                  {actionLoading[p.id + '_rev'] ? '...' : 'Inativar'}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => activate(p.id)}
                                disabled={actionLoading[p.id]}
                                className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                              >
                                {actionLoading[p.id] ? '...' : 'Ativar'}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(p)}
                              className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
                            >
                              Descadastrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PACIENTES ── */}
      {tab === 'patients' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {patients.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhum paciente cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">E-mail</th>
                    <th className="text-left px-4 py-3">Consultas</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.email}</td>
                      <td className="px-4 py-3 text-gray-600">{p._count?.appointmentsAsPatient ?? 0}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CONSULTAS ── */}
      {tab === 'appointments' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhuma consulta registrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Paciente</th>
                    <th className="text-left px-4 py-3">Farmacêutico</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.map((a) => {
                    const cfg = STATUS_LABEL[a.status] || { label: a.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{a.patient?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{a.patient?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{a.pharmacist?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{a.pharmacist?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDt(a.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── LOGS ── */}
      {tab === 'logs' && <LogsPanel api={api} pharmacists={pharmacists} patients={patients} />}

      {/* ── FINANCEIRO ── */}
      {tab === 'financeiro' && (
        <div className="space-y-6">

          {/* ── Visão financeira ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-end gap-3 justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Visão Financeira</h3>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">De</label>
                  <input type="date" value={finPeriodoDe} onChange={(e) => setFinPeriodoDe(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Até</label>
                  <input type="date" value={finPeriodoAte} onChange={(e) => setFinPeriodoAte(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none" />
                </div>
                <button
                  onClick={() => loadVisaoFinanceira(finPeriodoDe, finPeriodoAte)}
                  disabled={finVisaoLoading}
                  className="text-sm font-medium bg-violet-700 hover:bg-violet-800 text-white px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {finVisaoLoading ? '…' : 'Filtrar'}
                </button>
              </div>
            </div>
            {finVisao ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  value={`R$ ${Number(finVisao.totalFaturado).toFixed(2).replace('.', ',')}`}
                  label="Total faturado"
                  color="text-blue-600"
                />
                <StatCard
                  value={`R$ ${Number(finVisao.totalPagoFarm).toFixed(2).replace('.', ',')}`}
                  label="Pago farmacêuticos"
                  color="text-violet-600"
                />
                <StatCard
                  value={`R$ ${Number(finVisao.receitaLiquida).toFixed(2).replace('.', ',')}`}
                  label="Receita líquida"
                  color={finVisao.receitaLiquida >= 0 ? 'text-emerald-600' : 'text-red-500'}
                />
                <StatCard
                  value={String(finVisao.consultasConcluidas)}
                  label="Consultas concluídas"
                  sub={finVisao.periodo ? `${finVisao.periodo.de} → ${finVisao.periodo.ate}` : undefined}
                  color="text-gray-800"
                />
              </div>
            ) : (
              finVisaoLoading
                ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
                : null
            )}
          </div>

          {/* ── Configurações de preço e comissão ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Preço e Comissão Padrão</p>
              <p className="text-xs text-gray-500 mt-0.5">Aplicados em todos os novos agendamentos.</p>
            </div>
            {finLoading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="px-5 py-5 space-y-5">
                {/* Preço */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                    Preço da consulta (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={finPreco}
                    onChange={(e) => setFinPreco(e.target.value)}
                    style={{ width: '100%', maxWidth: 240, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Ex: 50.00"
                  />
                </div>

                {/* Comissão padrão */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>
                      Comissão padrão dos farmacêuticos
                    </label>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>{finComissao}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="1"
                    value={finComissao || 0}
                    onChange={(e) => setFinComissao(e.target.value)}
                    style={{ width: '100%', accentColor: '#7c3aed' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    <span>0%</span>
                    <span style={{ color: '#7c3aed', fontWeight: 600, textAlign: 'center' }}>
                      R$ {(parseFloat(finPreco) || 0).toFixed(2).replace('.', ',')} cobrado → R$ {((parseFloat(finPreco) || 0) * (parseFloat(finComissao) || 0) / 100).toFixed(2).replace('.', ',')} ao farmacêutico ({finComissao}%)
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Botão único salvar ambos */}
                <button
                  disabled={finSaving}
                  onClick={async () => {
                    const preco      = parseFloat(finPreco);
                    const percentual = parseFloat(finComissao);
                    if (isNaN(preco) || preco <= 0)              { showToast('error', 'Preço inválido.'); return; }
                    if (isNaN(percentual) || percentual < 0 || percentual > 100) { showToast('error', 'Comissão inválida (0–100).'); return; }
                    setFinSaving(true);
                    try {
                      const res = await api('/api/admin/config', {
                        method: 'PUT',
                        body: JSON.stringify({ preco_consulta: preco, comissao_padrao: percentual }),
                      });
                      if (res.ok) {
                        showToast('success', '✅ Configurações salvas!');
                        setFinConfig((prev) => prev ? { ...prev, preco, comissaoPadrao: percentual } : prev);
                      } else {
                        const d = await res.json().catch(() => ({}));
                        showToast('error', d.error || 'Erro ao salvar.');
                      }
                    } catch { showToast('error', 'Falha de conexão.'); }
                    finally { setFinSaving(false); }
                  }}
                  style={{
                    background: finSaving ? '#9ca3af' : '#2563eb',
                    color: '#ffffff',
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: finSaving ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 'bold',
                    marginTop: 12,
                    display: 'block',
                  }}
                >
                  {finSaving ? 'Salvando…' : '💾 Salvar configurações'}
                </button>
              </div>
            )}
          </div>

          {/* ── Comissões individuais ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Comissões Individuais</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sobrescreve a comissão padrão por farmacêutico. Deixe em branco para usar o padrão.
              </p>
            </div>
            {finLoading || !finConfig ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : finConfig.farmaceuticos.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Nenhum farmacêutico cadastrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Nome</th>
                      <th className="text-left px-4 py-3">E-mail</th>
                      <th className="text-left px-4 py-3 w-44">Comissão (%)</th>
                      <th className="text-left px-4 py-3 w-36">Recebe/consulta</th>
                      <th className="text-left px-4 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {finConfig.farmaceuticos.map((f) => {
                      const current  = editingComissao[f.id] !== undefined
                        ? editingComissao[f.id]
                        : (f.comissao != null ? String(f.comissao) : '');
                      const isSaving = !!savingComissao[f.id];
                      const pctNum   = current.trim() !== '' ? parseFloat(current) : finConfig.comissaoPadrao;
                      const recebe   = isNaN(pctNum) ? null : (finConfig.preco * pctNum / 100);
                      const isPadrao = current.trim() === '';

                      return (
                        <tr key={f.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">{f.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{f.email}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={current}
                                placeholder={`padrão (${finConfig.comissaoPadrao}%)`}
                                onChange={(e) => setEditingComissao((prev) => ({ ...prev, [f.id]: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                              />
                              <span className="text-gray-400 text-xs shrink-0">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {recebe != null ? (
                              <span className={`text-sm font-semibold ${isPadrao ? 'text-gray-400' : 'text-violet-700'}`}>
                                R$ {recebe.toFixed(2).replace('.', ',')}
                                {isPadrao && <span className="text-[10px] font-normal ml-1">(padrão)</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={isSaving || current.trim() === ''}
                                style={{ opacity: (isSaving || current.trim() === '') ? 0.4 : 1 }}
                                onClick={async () => {
                                  const pct = parseFloat(current);
                                  if (isNaN(pct) || pct < 0 || pct > 100) {
                                    showToast('error', 'Percentual inválido (0–100).');
                                    return;
                                  }
                                  setSavingComissao((prev) => ({ ...prev, [f.id]: true }));
                                  try {
                                    const res = await api(`/api/admin/comissoes/${f.id}`, {
                                      method: 'PUT', body: JSON.stringify({ percentual: pct }),
                                    });
                                    if (res.ok) {
                                      showToast('success', `Comissão de ${f.name} atualizada para ${pct}%.`);
                                      setFinConfig((prev) => ({
                                        ...prev,
                                        farmaceuticos: prev.farmaceuticos.map((x) =>
                                          x.id === f.id ? { ...x, comissao: pct } : x
                                        ),
                                      }));
                                      setEditingComissao((prev) => ({ ...prev, [f.id]: String(pct) }));
                                    } else {
                                      showToast('error', 'Erro ao salvar.');
                                    }
                                  } catch { showToast('error', 'Falha de conexão.'); }
                                  finally { setSavingComissao((prev) => ({ ...prev, [f.id]: false })); }
                                }}
                                className="px-3 py-1.5 text-xs font-semibold bg-violet-700 hover:bg-violet-800 text-white rounded-lg transition"
                              >
                                {isSaving ? '…' : '💾 Salvar'}
                              </button>
                              <button
                                disabled={isSaving || (f.comissao == null && current.trim() === '')}
                                style={{ opacity: (isSaving || (f.comissao == null && current.trim() === '')) ? 0.4 : 1 }}
                                onClick={async () => {
                                  setSavingComissao((prev) => ({ ...prev, [f.id]: true }));
                                  try {
                                    const res = await api(`/api/admin/comissoes/${f.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      showToast('success', `${f.name} voltará a usar a comissão padrão (${finConfig.comissaoPadrao}%).`);
                                      setFinConfig((prev) => ({
                                        ...prev,
                                        farmaceuticos: prev.farmaceuticos.map((x) =>
                                          x.id === f.id ? { ...x, comissao: null } : x
                                        ),
                                      }));
                                      setEditingComissao((prev) => ({ ...prev, [f.id]: '' }));
                                    } else {
                                      showToast('error', 'Erro ao remover comissão.');
                                    }
                                  } catch { showToast('error', 'Falha de conexão.'); }
                                  finally { setSavingComissao((prev) => ({ ...prev, [f.id]: false })); }
                                }}
                                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition"
                              >
                                🔄 Usar padrão
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog: confirmar inativação */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmRevoke(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Inativar farmacêutico?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{confirmRevoke.name}</strong> será inativado e não poderá realizar atendimentos.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5 mt-3">
              <p className="text-xs text-amber-800 font-semibold">
                ⚠️ Todas as consultas futuras agendadas com este profissional serão <strong>canceladas automaticamente</strong>.
                Os pacientes afetados serão notificados por e-mail.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => revokeConfirmed(confirmRevoke.id)}
                disabled={actionLoading[confirmRevoke.id + '_rev']}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-60 transition"
              >
                {actionLoading[confirmRevoke.id + '_rev'] ? 'Inativando...' : 'Inativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: PARCEIROS ─────────────────────────────────────────────────── */}
      {tab === 'parceiros' && (
        <div className="space-y-6">

          {/* Toggle global */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '0 0 4px' }}>
                Seção "Onde comprar"
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                {ondeComprarAtivo
                  ? 'Ativa — pacientes veem a seção após consultas concluídas.'
                  : 'Inativa — seção oculta para todos os pacientes.'}
              </p>
            </div>
            <button
              onClick={handleToggleOC}
              disabled={togglingOC}
              style={{
                padding: '8px 18px', border: 'none', borderRadius: 8,
                fontWeight: 700, fontSize: 13, cursor: togglingOC ? 'wait' : 'pointer',
                background: ondeComprarAtivo ? '#dc2626' : '#16a34a',
                color: 'white', opacity: togglingOC ? 0.6 : 1, flexShrink: 0,
              }}
            >
              {togglingOC ? '...' : ondeComprarAtivo ? 'Desativar' : 'Ativar'}
            </button>
          </div>

          {/* Métricas — cliques últimos 30 dias */}
          {metricasParceiros.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>
                Cliques por parceiro — últimos 30 dias
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {metricasParceiros.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#374151' }}>
                      {m.nome}
                      {!m.ativo && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>(inativo)</span>}
                    </span>
                    <span style={{ fontWeight: 700, color: m.clicks > 0 ? '#7c3aed' : '#9ca3af' }}>
                      {m.clicks} clique{m.clicks !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cabeçalho da lista + botão novo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: 0 }}>
              Parceiros cadastrados ({parceiros.length})
            </p>
            <button
              onClick={() => { setParceirosForm({ nome: '', logoUrl: '', baseUrl: '', affiliateCode: '', linkTemplate: '', ativo: true, ordem: parceiros.length }); setParceirosFormErr(''); }}
              style={{ padding: '7px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              + Novo parceiro
            </button>
          </div>

          {/* Formulário de criação / edição */}
          {parceirosForm && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#5b21b6', marginBottom: 12 }}>
                {parceirosForm.id ? 'Editar parceiro' : 'Novo parceiro'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {[
                  { key: 'nome',          label: 'Nome *',              placeholder: 'Droga Raia' },
                  { key: 'baseUrl',       label: 'URL base *',          placeholder: 'https://drogaraia.com.br' },
                  { key: 'affiliateCode', label: 'Código afiliado *',   placeholder: 'telefarmacia2024' },
                  { key: 'logoUrl',       label: 'URL do logo',         placeholder: 'https://...' },
                  { key: 'linkTemplate',  label: 'Template MIP',        placeholder: 'https://drogaraia.com.br/busca?q={produto}&aff={code}' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>{label}</label>
                    <input
                      type="text"
                      value={parceirosForm[key] ?? ''}
                      onChange={(e) => setParceirosForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd6fe', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Ordem</label>
                  <input
                    type="number"
                    value={parceirosForm.ordem ?? 0}
                    onChange={(e) => setParceirosForm((p) => ({ ...p, ordem: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd6fe', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16 }}>
                  <input
                    type="checkbox"
                    id="parceiroAtivo"
                    checked={parceirosForm.ativo ?? true}
                    onChange={(e) => setParceirosForm((p) => ({ ...p, ativo: e.target.checked }))}
                  />
                  <label htmlFor="parceiroAtivo" style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Ativo</label>
                </div>
              </div>
              {parceirosFormErr && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{parceirosFormErr}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => { setParceirosForm(null); setParceirosFormErr(''); }}
                  style={{ padding: '7px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveParceiro}
                  disabled={savingParceiro}
                  style={{ padding: '7px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: savingParceiro ? 'wait' : 'pointer', opacity: savingParceiro ? 0.6 : 1 }}
                >
                  {savingParceiro ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de parceiros */}
          {parceirosLoading ? (
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Carregando...</p>
          ) : parceiros.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum parceiro cadastrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parceiros.map((p) => (
                <div key={p.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {p.logoUrl ? (
                      <img src={p.logoUrl} alt={p.nome} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid #e5e7eb' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 4, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>
                        {p.nome.charAt(0)}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.nome}
                        <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6, fontSize: 12 }}>ordem {p.ordem}</span>
                        {!p.ativo && <span style={{ marginLeft: 6, fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>inativo</span>}
                      </p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                        {p.baseUrl}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => { setParceirosForm({ ...p }); setParceirosFormErr(''); }}
                      style={{ padding: '5px 12px', background: 'white', border: '1px solid #ddd6fe', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#7c3aed', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDelParceiro(p)}
                      style={{ padding: '5px 12px', background: 'white', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA REPASSES ── */}
      {tab === 'repasses' && (
        <div className="space-y-6">

          {/* Formulário de prévia */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Registrar repasse</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Farmacêutico</label>
                <select
                  value={repasseFarmId}
                  onChange={(e) => { setRepasseFarmId(e.target.value); setRepassePreview(null); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Selecionar...</option>
                  {pharmacists.filter((p) => p.pharmacistProfile?.isApproved || p.pharmacistProfile?.isSuspended).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">De</label>
                <input type="date" value={repasseDe} onChange={(e) => { setRepasseDe(e.target.value); setRepassePreview(null); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Até</label>
                <input type="date" value={repasseAte} onChange={(e) => { setRepasseAte(e.target.value); setRepassePreview(null); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            {repassePreviewErr && (
              <p className="text-xs text-red-600 mb-3">{repassePreviewErr}</p>
            )}
            <button
              onClick={handlePreviewRepasse}
              disabled={repasseLoading}
              className="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-5 py-2 rounded-xl transition disabled:opacity-50"
            >
              {repasseLoading ? 'Carregando...' : 'Pré-visualizar'}
            </button>

            {/* Prévia */}
            {repassePreview && (
              <div className="mt-5 border border-violet-200 rounded-xl overflow-hidden">
                <div className="bg-violet-50 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-violet-800 text-sm">{repassePreview.farmaceutico.nome}</p>
                    <p className="text-xs text-violet-600">{repassePreview.farmaceutico.email}</p>
                    {repassePreview.farmaceutico.chavePix && (
                      <p className="text-xs text-violet-700 mt-0.5">PIX: <strong>{repassePreview.farmaceutico.chavePix}</strong></p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-violet-800">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(repassePreview.valorTotal)}
                    </p>
                    <p className="text-xs text-violet-600">{repassePreview.items.length} consultas · {repassePreview.percentual}% comissão</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {repassePreview.items.map((item) => (
                    <div key={item.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{item.paciente}</p>
                        <p className="text-xs text-gray-400">{new Date(item.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} · {item.tipo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-violet-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorLiquido)}</p>
                        <p className="text-[10px] text-gray-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorBruto)} bruto</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-4 border-t border-violet-100 bg-violet-50 flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-semibold text-violet-700 mb-1">Referência do pagamento (opcional)</label>
                    <input
                      type="text"
                      value={repasseRef}
                      onChange={(e) => setRepasseRef(e.target.value)}
                      placeholder="ID da transferência, comprovante..."
                      className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <button
                    onClick={handleConfirmarRepasse}
                    disabled={repasseConfirming}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 shrink-0"
                  >
                    {repasseConfirming ? 'Registrando...' : '✓ Confirmar repasse'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Histórico de repasses */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">Histórico de repasses</h3>
              <button onClick={() => loadRepasseHistorico(repasseFarmId)} className="text-xs text-violet-600 hover:underline">
                Atualizar
              </button>
            </div>
            {repasseHistLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
            ) : repasseHistorico.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 italic">Nenhum repasse registrado.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {repasseHistorico.map((r) => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setRepasseExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{r.pharmacist?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {r.referenciaTransacao && ` · ref: ${r.referenciaTransacao}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valorTotal)}</p>
                        <p className="text-[10px] text-gray-400">{r.itensCount} consulta{r.itensCount !== 1 ? 's' : ''} · {repasseExpanded[r.id] ? '▲' : '▼'}</p>
                      </div>
                    </div>
                    {repasseExpanded[r.id] && r.itens?.length > 0 && (
                      <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                        {r.itens.map((it) => (
                          <div key={it.id} className="flex items-center justify-between px-4 py-2 text-xs border-b border-gray-50 last:border-0">
                            <span className="text-gray-600">{it.consultaTipo} · {it.consultaId.slice(0, 8)}...</span>
                            <span className="font-semibold text-violet-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.valorLiquido)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA CONVITES ── */}
      {tab === 'convites' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Convidar farmacêutico</h3>
                <p className="text-xs text-gray-400 mt-0.5">O link de convite é válido por 7 dias.</p>
              </div>
              {!conviteForm && (
                <button
                  onClick={() => { setConviteForm({}); setConviteNome(''); setConviteEmail(''); setConviteErr(''); setConviteLink(null); }}
                  className="bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  + Novo convite
                </button>
              )}
            </div>

            {conviteForm !== null && (
              <form onSubmit={handleCriarConvite} className="border border-violet-100 rounded-xl p-4 bg-violet-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-violet-700 mb-1">Nome completo</label>
                    <input type="text" value={conviteNome} onChange={(e) => setConviteNome(e.target.value)}
                      placeholder="Dra. Fulana da Silva"
                      className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-violet-700 mb-1">E-mail</label>
                    <input type="email" value={conviteEmail} onChange={(e) => setConviteEmail(e.target.value)}
                      placeholder="farmaceutico@exemplo.com"
                      className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                {conviteErr && <p className="text-xs text-red-600">{conviteErr}</p>}
                {conviteLink && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Convite criado! Copie o link:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white border border-green-200 rounded px-2 py-1 flex-1 truncate">
                        {window.location.origin}{conviteLink}
                      </code>
                      <button type="button"
                        onClick={() => navigator.clipboard.writeText(window.location.origin + conviteLink)}
                        className="text-xs text-green-700 border border-green-300 rounded-lg px-2 py-1 hover:bg-green-100 transition shrink-0"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setConviteForm(null); setConviteLink(null); }}
                    className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition">
                    Fechar
                  </button>
                  <button type="submit" disabled={savingConvite}
                    className="text-sm font-bold bg-violet-700 hover:bg-violet-800 text-white px-5 py-2 rounded-xl transition disabled:opacity-50">
                    {savingConvite ? 'Enviando...' : 'Gerar convite'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Lista de convites */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Convites enviados</h3>
            </div>
            {convitesLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
            ) : convites.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 italic">Nenhum convite enviado.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {convites.map((c) => {
                  const expired = new Date(c.expiresAt) < new Date();
                  const status  = c.usado ? 'usado' : expired ? 'expirado' : 'pendente';
                  return (
                    <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{c.nome}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Expira em {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          status === 'usado'     ? 'bg-green-100 text-green-700'
                          : status === 'expirado' ? 'bg-gray-100 text-gray-500'
                          :                        'bg-amber-100 text-amber-700'
                        }`}>
                          {status === 'usado' ? '✓ Usado' : status === 'expirado' ? 'Expirado' : '⏳ Pendente'}
                        </span>
                        {status === 'pendente' && (
                          <>
                            <button
                              onClick={() => navigator.clipboard.writeText(window.location.origin + '/convite/' + c.token)}
                              className="text-xs text-violet-600 border border-violet-200 rounded-lg px-2 py-1 hover:bg-violet-50 transition"
                            >
                              Copiar link
                            </button>
                            <button
                              onClick={() => handleRevogarConvite(c.id)}
                              className="text-xs text-red-500 border border-red-100 rounded-lg px-2 py-1 hover:bg-red-50 transition"
                            >
                              Revogar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog: confirmar exclusão de parceiro */}
      {confirmDelParceiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelParceiro(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Excluir parceiro?</h3>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{confirmDelParceiro.nome}</strong> será removido. Os dados de clique históricos serão perdidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelParceiro(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={() => handleDeleteParceiro(confirmDelParceiro.id)}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: confirmar suspensão */}
      {confirmSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmSuspend(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Suspender farmacêutico?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{confirmSuspend.name}</strong> deixará de receber novas consultas imediatamente.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-5 mt-3">
              <p className="text-xs text-orange-800 font-semibold">
                ⚠️ Consultas agendadas futuras serão canceladas e os pacientes notificados.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSuspend(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={() => handleSuspender(confirmSuspend.id)}
                disabled={suspendLoading}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-60 transition">
                {suspendLoading ? 'Suspendendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Descadastrar farmacêutico?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{confirmDelete.name}</strong> perderá o perfil de farmacêutico e seus horários futuros serão removidos.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5 mt-3">
              <p className="text-xs text-red-800 font-semibold">
                ⚠️ Consultas futuras serão canceladas e os pacientes notificados. O histórico é preservado.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteFarm(confirmDelete.id)}
                disabled={actionLoading[confirmDelete.id + '_del']}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition"
              >
                {actionLoading[confirmDelete.id + '_del'] ? 'Removendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
