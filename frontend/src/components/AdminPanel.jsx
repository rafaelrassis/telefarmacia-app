import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ConsultaModal from './ConsultaModal';
import Paginacao from './Paginacao';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const DEFAULT_HORARIOS = DIAS_SEMANA.map((_, i) => ({
  diaSemana: i,
  horaInicio: '08:00',
  horaFim: '18:00',
  ativo: i >= 1 && i <= 5,
}));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

// ── Sub-aba "Ações admin" ─────────────────────────────────────────────────────

const AUDIT_ACAO_LABEL = {
  aprovar_farmaceutico:            'Aprovar farmacêutico',
  revogar_aprovacao_farmaceutico:  'Revogar aprovação',
  descadastrar_farmaceutico:       'Descadastrar farmacêutico',
  alterar_status_farmaceutico:     'Alterar status',
  ativar_farmaceutico:             'Ativar farmacêutico',
  suspender_farmaceutico:          'Suspender farmacêutico',
  reativar_farmaceutico:           'Reativar farmacêutico',
  toggle_sistema:                  'Abrir/fechar sistema',
  salvar_horarios_sistema:         'Salvar horários',
  set_preco_consulta:              'Definir preço da consulta',
  set_comissao_padrao:             'Definir comissão padrão',
  set_config_financeiro:           'Salvar config. financeira',
  set_comissao_individual:         'Definir comissão individual',
  remover_comissao_individual:     'Remover comissão individual',
  registrar_repasse:               'Registrar repasse',
  criar_convite_farmaceutico:      'Criar convite',
  revogar_convite_farmaceutico:    'Revogar convite',
  criar_parceiro:                  'Criar parceiro',
  atualizar_parceiro:              'Atualizar parceiro',
  excluir_parceiro:                'Excluir parceiro',
  ajustar_carteira:                'Ajuste de carteira',
  adicionar_admin:                 'Adicionar admin',
  remover_admin:                   'Remover admin',
};

const AuditPanel = ({ api }) => {
  const [items, setItems]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [filterAcao, setFilterAcao] = useState('');

  const LIMIT = 20;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchAudit = useCallback(async (pg) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (filterAcao) p.set('acao', filterAcao);
      const res = await api(`/api/admin/audit?${p}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [api, filterAcao]);

  useEffect(() => { setPage(1); fetchAudit(1); }, [fetchAudit]);

  const goPage = (pg) => { setPage(pg); fetchAudit(pg); };

  const fmtAlvo = (tipo, id) => {
    if (!tipo && !id) return '—';
    const short = id ? `${id.slice(0, 8)}…` : '';
    return tipo ? `${tipo}${short ? ` · ${short}` : ''}` : short;
  };

  const fmtDetalhes = (det) => {
    if (!det || Object.keys(det).length === 0) return '—';
    try {
      return JSON.stringify(det).slice(0, 100);
    } catch { return '—'; }
  };

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {!loading && `${total} ${total === 1 ? 'ação' : 'ações'}`}
        </span>
        <select value={filterAcao} onChange={(e) => setFilterAcao(e.target.value)} style={SEL_STYLE}>
          <option value="">Todas as ações</option>
          {Object.entries(AUDIT_ACAO_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhuma ação registrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3">Admin</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Alvo</th>
                  <th className="text-left px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDt(it.createdAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-gray-800 font-medium">{it.adminNome}</p>
                      <p className="text-gray-400">{it.adminEmail ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 8px', borderRadius: 9999,
                        fontSize: 11, fontWeight: 600,
                        background: '#eff6ff', color: '#1d4ed8',
                      }}>
                        {AUDIT_ACAO_LABEL[it.acao] ?? it.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtAlvo(it.alvoTipo, it.alvoId)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDetalhes(it.detalhes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && <Paginacao page={page} totalPages={totalPages} onPageChange={goPage} />}
    </div>
  );
};

// ── Dashboard operacional em tempo real ──────────────────────────────────────

const OperacionalCard = ({ api }) => {
  const [data, setData] = useState(null);

  const fetchTempoReal = useCallback(async () => {
    try {
      const res = await api('/api/admin/fila/tempo-real');
      if (res.ok) setData(await res.json());
    } catch (_) {}
  }, [api]);

  useEffect(() => {
    fetchTempoReal();
    const id = setInterval(fetchTempoReal, 30000);
    return () => clearInterval(id);
  }, [fetchTempoReal]);

  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="h-16 animate-pulse bg-gray-50 rounded-lg" />
      </div>
    );
  }

  const alerta = data.urgentes_aguardando > 0 && data.espera_mais_antiga_min >= 10;
  const atencao = data.urgentes_aguardando > 0 && !alerta;

  const cardCls = alerta
    ? 'bg-red-50 border-red-200'
    : atencao
      ? 'bg-amber-50 border-amber-200'
      : 'bg-white border-gray-200';

  const Item = ({ value, label, color = 'text-gray-900' }) => (
    <div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className={`border rounded-xl p-5 transition-colors ${cardCls}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-800 text-sm">⚡ Operação em tempo real</p>
        <span className="text-xs text-gray-400">↻ 30s</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <Item
          value={data.urgentes_aguardando}
          label="Urgentes aguardando"
          color={alerta ? 'text-red-600' : atencao ? 'text-amber-600' : 'text-gray-900'}
        />
        <Item
          value={data.urgentes_aguardando > 0 ? `${data.espera_mais_antiga_min}min` : '—'}
          label="Espera mais antiga"
          color={alerta ? 'text-red-600' : 'text-gray-900'}
        />
        <Item value={data.agendadas_aguardando_24h} label="Agendadas (24h)" />
        <Item value={data.em_atendimento_agora} label="Em atendimento" color="text-green-600" />
        <Item value={data.farmaceuticos_online} label="Farmacêuticos online" color="text-blue-600" />
        <Item value={data.disponiveis_urgencia} label="Disponíveis p/ urgência" color="text-violet-600" />
        <Item value={data.expiradas_hoje} label="Expiradas hoje" color={data.expiradas_hoje > 0 ? 'text-amber-600' : 'text-gray-900'} />
      </div>
      <div className="flex gap-6 mt-4 pt-4 border-t border-black/5 text-xs text-gray-500">
        <span>Tempo médio de aceite (7d) — urgente: <strong className="text-gray-700">{data.tempo_medio_aceite_7d_min.urgente != null ? `${data.tempo_medio_aceite_7d_min.urgente}min` : '—'}</strong></span>
        <span>agendada: <strong className="text-gray-700">{data.tempo_medio_aceite_7d_min.agendada != null ? `${data.tempo_medio_aceite_7d_min.agendada}min` : '—'}</strong></span>
      </div>
    </div>
  );
};

// ── Aba "Consultas" (fila agendada + urgente) ────────────────────────────────

const CONSULTA_STATUS_CFG = {
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

// ── Aba "Avaliações" (admin) ─────────────────────────────────────────────────

const Estrelas = ({ nota, size = 16 }) => (
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

// ── Aba "Logs" com sub-abas: Consultas / Ações admin ─────────────────────────

const LogsTabContainer = ({ api, pharmacists, patients }) => {
  const [subTab, setSubTab] = useState('consultas');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-100">
        {[{ id: 'consultas', label: 'Consultas' }, { id: 'admin', label: 'Ações admin' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              subTab === t.id ? 'border-violet-700 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {subTab === 'consultas' && <LogsPanel api={api} pharmacists={pharmacists} patients={patients} />}
      {subTab === 'admin' && <AuditPanel api={api} />}
    </div>
  );
};

// ── Modal: ocorrências (devoluções / sem-contato) de um farmacêutico ────────

const OCORRENCIA_ACAO_LABEL = {
  devolvido:    'Devolução à fila',
  sem_contato:  'Sem contato com paciente',
};

const OcorrenciasModal = ({ api, farmaceutico, onClose }) => {
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchPage = useCallback(async (pg) => {
    setLoading(true);
    try {
      const res = await api(`/api/admin/farmaceuticos/${farmaceutico.id}/ocorrencias?page=${pg}&limit=${LIMIT}`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.data ?? []);
        setTotal(d.total ?? 0);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [api, farmaceutico.id]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const goPage = (pg) => { setPage(pg); fetchPage(pg); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">Ocorrências (30d)</h3>
            <p className="text-xs text-gray-500 mt-0.5">{farmaceutico.name} — {farmaceutico.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma ocorrência nos últimos 30 dias.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={it.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      it.acao === 'devolvido' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {OCORRENCIA_ACAO_LABEL[it.acao] ?? it.acao}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDt(it.criadoEm)}</span>
                  </div>
                  {it.detalhes?.motivo && (
                    <p className="text-xs text-gray-500 mt-1">Motivo: {it.detalhes.motivo}</p>
                  )}
                  {it.detalhes?.tipo && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Consulta {it.detalhes.tipo}</p>
                  )}
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  disabled={page <= 1}
                  onClick={() => goPage(page - 1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  ‹
                </button>
                <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Modal: ajuste manual de saldo (carteira) de um paciente ─────────────────

const AjusteCarteiraModal = ({ api, paciente, onClose, onSuccess, showToast }) => {
  const [valor, setValor]   = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const handleSubmit = async () => {
    setErr('');
    const num = parseFloat(valor);
    if (isNaN(num) || num === 0) { setErr('Informe um valor diferente de zero.'); return; }
    if (motivo.trim().length < 3) { setErr('Informe um motivo (mín. 3 caracteres).'); return; }
    setSaving(true);
    try {
      const res = await api(`/api/admin/carteira/${paciente.id}/ajuste`, {
        method: 'POST',
        body: JSON.stringify({ valor: num, motivo: motivo.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast?.('success', '✅ Saldo ajustado!');
        onSuccess?.(paciente.id, d.saldo);
        onClose();
      } else {
        setErr(d.error || 'Erro ao ajustar saldo.');
      }
    } catch {
      setErr('Falha de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-900 mb-1">Ajustar saldo</h3>
        <p className="text-xs text-gray-500 mb-4">{paciente.name} — {paciente.email}</p>
        <p className="text-xs text-gray-500 mb-4">
          Saldo atual: <strong className="text-gray-700">R$ {(paciente.saldo ?? 0).toFixed(2)}</strong>
        </p>

        <label className="text-xs text-gray-500 font-medium">Valor (use negativo para remover)</label>
        <input
          type="number" step="0.01" value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex.: 20 ou -20"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 mb-3 focus:ring-2 focus:ring-violet-400 outline-none"
        />

        <label className="text-xs text-gray-500 font-medium">Motivo</label>
        <textarea
          value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
          placeholder="Ex.: Compensação por erro no atendimento"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 mb-3 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
        />

        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-60 transition">
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Aba "Administradores" ────────────────────────────────────────────────────

const AdminsTab = ({ api, showToast, currentUserEmail }) => {
  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding]     = useState(false);
  const [removing, setRemoving] = useState({});
  const [confirmRemove, setConfirmRemove] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/api/admin/admins');
      if (res.ok) {
        const d = await res.json();
        setAdmins(d.data ?? []);
      }
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    try {
      const res = await api('/api/admin/admins', { method: 'POST', body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('success', '✅ Administrador adicionado!');
        setNewEmail('');
        load();
      } else {
        showToast('error', d.error || 'Erro ao adicionar administrador.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setAdding(false); }
  };

  const handleRemove = async (email) => {
    setRemoving((r) => ({ ...r, [email]: true }));
    try {
      const res = await api(`/api/admin/admins/${encodeURIComponent(email)}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('success', 'Administrador removido.');
        setConfirmRemove(null);
        load();
      } else {
        showToast('error', d.error || 'Erro ao remover administrador.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setRemoving((r) => ({ ...r, [email]: false })); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Adicionar administrador</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 min-w-[240px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg disabled:opacity-40 transition"
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          O e-mail precisa corresponder à conta usada no login. Acesso liberado imediatamente.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhum administrador configurado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">Origem</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((a) => (
                <tr key={a.email} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {a.email}
                    {a.email === currentUserEmail && <span className="ml-2 text-[10px] text-violet-500 font-semibold">(você)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      a.origem === 'env' ? 'bg-gray-100 text-gray-500' : 'bg-violet-50 text-violet-700'
                    }`}>
                      {a.origem === 'env' ? 'Variável de ambiente' : 'Painel'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.removivel && a.email !== currentUserEmail && (
                      <button
                        onClick={() => setConfirmRemove(a.email)}
                        disabled={removing[a.email]}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmRemove(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Remover administrador?</h3>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{confirmRemove}</strong> perderá acesso ao painel administrativo.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removing[confirmRemove]}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition">
                {removing[confirmRemove] ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const AdminPanel = () => {
  const { token, user } = useAuth();
  const currentUserEmail = (user?.email || '').toLowerCase();
  const [tab, setTab] = useState('overview');
  const [metricas, setMetricas]       = useState(null);
  const [pharmacists, setPharmacists] = useState([]);
  const [patients, setPatients]       = useState([]);
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
  const [finMaxUrg, setFinMaxUrg]           = useState('1');
  const [finTolerancia, setFinTolerancia]   = useState('30');
  const [finLimiteOcorrencias, setFinLimiteOcorrencias] = useState('5');
  const [finSaving, setFinSaving]           = useState(false);
  const [viewingOcorrencias, setViewingOcorrencias] = useState(null);
  const [ajustandoCarteira, setAjustandoCarteira] = useState(null);
  const [finPeriodoDe, setFinPeriodoDe]     = useState('');
  const [finPeriodoAte, setFinPeriodoAte]   = useState('');
  const [finExportLoading, setFinExportLoading] = useState(false);
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
  const [repasseExportLoading, setRepasseExportLoading] = useState(false);
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
    const [mRes, pRes, patRes, sRes, hRes] = await Promise.all([
      api('/api/admin/metricas'),
      api('/api/admin/pharmacists'),
      api('/api/admin/patients'),
      fetch(`${API_URL}/api/sistema/status`),
      api('/api/admin/horarios'),
    ]);
    if (mRes.ok)   setMetricas(await mRes.json());
    if (pRes.ok)   { const pd = await pRes.json(); setPharmacists(pd.data ?? []); }
    if (patRes.ok) { const patd = await patRes.json(); setPatients(patd.data ?? []); }
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
        setFinMaxUrg(String(d.maxUrgenciasSimult ?? 1));
        setFinTolerancia(String(d.toleranciaExpiracaoAgendadaMin ?? 30));
        setFinLimiteOcorrencias(String(d.limiteOcorrencias30d ?? 5));
      }
    } finally { setFinLoading(false); }
  }, [api]);

  useEffect(() => { loadFinanceiro(); }, [loadFinanceiro]);

  const downloadCsv = async (path, filename) => {
    try {
      const res = await api(path);
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        showToast('error', 'Erro ao exportar CSV.');
      }
    } catch {
      showToast('error', 'Falha de conexão.');
    }
  };

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
    { id: 'consultas',    label: 'Consultas' },
    { id: 'avaliacoes',   label: '⭐ Avaliações' },
    { id: 'logs',         label: 'Logs' },
    { id: 'financeiro',   label: '💰 Financeiro' },
    { id: 'repasses',     label: '💳 Repasses' },
    { id: 'convites',     label: '✉️ Convites' },
    { id: 'parceiros',    label: '🤝 Parceiros' },
    { id: 'admins',       label: '🔐 Admins' },
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
          <OperacionalCard api={api} />

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
                    <th className="text-left px-4 py-3">Ocorrências (30d)</th>
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
                          {p.consultasCount ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const oc = p.ocorrencias30d ?? 0;
                            const limite = parseInt(finLimiteOcorrencias, 10) || 5;
                            const alerta = oc >= limite;
                            return (
                              <button
                                onClick={() => setViewingOcorrencias(p)}
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition ${
                                  alerta ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {oc}
                              </button>
                            );
                          })()}
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
                    <th className="text-left px-4 py-3">Saldo</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.email}</td>
                      <td className="px-4 py-3 text-gray-600">{p.consultasCount ?? 0}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        R$ {(p.saldo ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAjustandoCarteira(p)}
                          className="text-xs font-semibold border border-violet-200 text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                        >
                          Ajustar saldo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CONSULTAS (fila) ── */}
      {tab === 'consultas' && <ConsultasTab api={api} />}

      {/* ── AVALIAÇÕES ── */}
      {tab === 'avaliacoes' && <AvaliacoesAdminTab api={api} pharmacists={pharmacists} />}

      {/* ── LOGS ── */}
      {tab === 'logs' && <LogsTabContainer api={api} pharmacists={pharmacists} patients={patients} />}

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
                <button
                  onClick={async () => {
                    setFinExportLoading(true);
                    const p = new URLSearchParams();
                    if (finPeriodoDe)  p.set('de', finPeriodoDe);
                    if (finPeriodoAte) p.set('ate', finPeriodoAte);
                    await downloadCsv(`/api/admin/financeiro/export?${p}`, `financeiro-${new Date().toISOString().split('T')[0]}.csv`);
                    setFinExportLoading(false);
                  }}
                  disabled={finExportLoading}
                  className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {finExportLoading ? 'Exportando…' : '📥 Exportar CSV'}
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

                {/* Limite de urgências simultâneas */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                    Limite de urgências simultâneas por farmacêutico
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={finMaxUrg}
                    onChange={(e) => setFinMaxUrg(e.target.value)}
                    style={{ width: '100%', maxWidth: 120, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="1"
                  />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    Farmacêutico no limite não recebe novas urgências. Default: 1.
                  </p>
                </div>

                {/* Tolerância de expiração de consulta agendada */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                    Tolerância p/ expirar consulta agendada sem aceite (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="240"
                    step="1"
                    value={finTolerancia}
                    onChange={(e) => setFinTolerancia(e.target.value)}
                    style={{ width: '100%', maxWidth: 120, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="30"
                  />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    Após o horário marcado + esse prazo sem aceite, a consulta expira com estorno automático. Default: 30 min.
                  </p>
                </div>

                {/* Limite de ocorrências (devoluções/sem-contato) em 30 dias */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                    Limite de ocorrências (30d) p/ alerta de farmacêutico
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    value={finLimiteOcorrencias}
                    onChange={(e) => setFinLimiteOcorrencias(e.target.value)}
                    style={{ width: '100%', maxWidth: 120, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="5"
                  />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    Devoluções + "sem contato" nos últimos 30 dias. Acima disso, o farmacêutico é destacado na aba Farmacêuticos. Default: 5.
                  </p>
                </div>

                {/* Botão único salvar ambos */}
                <button
                  disabled={finSaving}
                  onClick={async () => {
                    const preco       = parseFloat(finPreco);
                    const percentual  = parseFloat(finComissao);
                    const maxUrg      = parseInt(finMaxUrg, 10);
                    const tolerancia  = parseInt(finTolerancia, 10);
                    const limiteOcorrencias = parseInt(finLimiteOcorrencias, 10);
                    if (isNaN(preco) || preco <= 0)                              { showToast('error', 'Preço inválido.'); return; }
                    if (isNaN(percentual) || percentual < 0 || percentual > 100) { showToast('error', 'Comissão inválida (0–100).'); return; }
                    if (isNaN(maxUrg) || maxUrg < 1 || maxUrg > 20)             { showToast('error', 'Limite de urgências inválido (1–20).'); return; }
                    if (isNaN(tolerancia) || tolerancia < 5 || tolerancia > 240) { showToast('error', 'Tolerância de expiração inválida (5–240 min).'); return; }
                    if (isNaN(limiteOcorrencias) || limiteOcorrencias < 1 || limiteOcorrencias > 50) { showToast('error', 'Limite de ocorrências inválido (1–50).'); return; }
                    setFinSaving(true);
                    try {
                      const res = await api('/api/admin/config', {
                        method: 'PUT',
                        body: JSON.stringify({
                          preco_consulta: preco, comissao_padrao: percentual, max_urgencias_simultaneas: maxUrg,
                          tolerancia_expiracao_agendada_min: tolerancia, limite_ocorrencias_30d: limiteOcorrencias,
                        }),
                      });
                      if (res.ok) {
                        showToast('success', '✅ Configurações salvas!');
                        setFinConfig((prev) => prev ? { ...prev, preco, comissaoPadrao: percentual, maxUrgenciasSimult: maxUrg, toleranciaExpiracaoAgendadaMin: tolerancia, limiteOcorrencias30d: limiteOcorrencias } : prev);
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
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setRepasseExportLoading(true);
                    const p = new URLSearchParams();
                    if (repasseFarmId) p.set('pharmacistId', repasseFarmId);
                    await downloadCsv(`/api/admin/repasses/export?${p}`, `repasses-${new Date().toISOString().split('T')[0]}.csv`);
                    setRepasseExportLoading(false);
                  }}
                  disabled={repasseExportLoading}
                  className="text-xs font-medium text-violet-600 hover:underline disabled:opacity-50"
                >
                  {repasseExportLoading ? 'Exportando…' : '📥 Exportar CSV'}
                </button>
                <button onClick={() => loadRepasseHistorico(repasseFarmId)} className="text-xs text-violet-600 hover:underline">
                  Atualizar
                </button>
              </div>
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

      {/* ── ADMINISTRADORES ── */}
      {tab === 'admins' && <AdminsTab api={api} showToast={showToast} currentUserEmail={currentUserEmail} />}

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

      {viewingOcorrencias && (
        <OcorrenciasModal
          api={api}
          farmaceutico={viewingOcorrencias}
          onClose={() => setViewingOcorrencias(null)}
        />
      )}

      {ajustandoCarteira && (
        <AjusteCarteiraModal
          api={api}
          paciente={ajustandoCarteira}
          showToast={showToast}
          onClose={() => setAjustandoCarteira(null)}
          onSuccess={(pacienteId, novoSaldo) => {
            setPatients((prev) => prev.map((p) => (p.id === pacienteId ? { ...p, saldo: novoSaldo } : p)));
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;
