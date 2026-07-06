import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ConsultaModal from './ConsultaModal';
import ConsultaDetalhesPaciente from './ConsultaDetalhesPaciente';
import ReceitaViewer from './ReceitaViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  aguardando:           { label: 'Aguardando farmacêutico', cls: 'text-gray-500',    dot: 'bg-gray-400' },
  aceito:               { label: 'Confirmado',              cls: 'text-blue-600',    dot: 'bg-blue-500' },
  em_atendimento:       { label: 'Em atendimento',          cls: 'text-green-600',   dot: 'bg-green-500' },
  concluido:            { label: 'Concluído',               cls: 'text-violet-600',  dot: 'bg-violet-500' },
  cancelado:            { label: 'Cancelado',               cls: 'text-red-500',     dot: 'bg-red-400' },
  expirado:             { label: 'Expirado',                cls: 'text-gray-400',    dot: 'bg-gray-300' },
  remarcacao_pendente:  { label: 'Remarcação pendente',     cls: 'text-amber-600',   dot: 'bg-amber-400' },
};

const TIPO_BADGE = {
  agendada:    { label: 'Agendada',   cls: 'bg-violet-100 text-violet-700' },
  urgente:     { label: 'Urgente',    cls: 'bg-red-100 text-red-700' },
};

// Status efetivo: "aceito" em agendada futura ≠ "em atendimento" (item 4)
const getEffectiveStatus = (app) => {
  if (app.tipo === 'urgente' && app.status === 'aceito') return 'em_atendimento';
  if (app.tipo === 'agendada' && app.status === 'aceito') {
    return new Date(app.dataHora) <= new Date() ? 'em_atendimento' : 'aceito';
  }
  return app.status;
};

// ── Componente principal ──────────────────────────────────────────────────────

const MyAppointments = ({ onCancelled, selectedPerson = null, refreshKey = 0 }) => {
  const { token, user, activeEnv } = useAuth();
  const isPharmacist = activeEnv === 'pharmacist';

  // Estado compartilhado
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);

  // Filtros e paginação (farmacêutico e paciente)
  const [filterDe,     setFilterDe]     = useState('');
  const [filterAte,    setFilterAte]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(false);
  const [total,        setTotal]        = useState(0);
  const [loadingMore,  setLoadingMore]  = useState(false);

  // Cancelar item de fila (paciente)
  const [confirmCancelFila, setConfirmCancelFila] = useState(null);
  const [cancellingFilaId,  setCancellingFilaId]  = useState(null);
  const [cancelToast,       setCancelToast]       = useState(null);

  // Detalhes da consulta (paciente)
  const [viewingDetalhes, setViewingDetalhes] = useState(null); // { id, tipo }
  // Ver receita inline
  const [viewingReceita,  setViewingReceita]  = useState(null); // { id, tipo, data }

  // Timer para contagem regressiva / destaque "É agora"
  const [agoraNow, setAgoraNow] = useState(Date.now());

  // Ver detalhes (farmacêutico)
  const [viewingConsulta, setViewingConsulta] = useState(null);

  // ── Fetch farmacêutico com filtros e paginação ───────────────────────────
  useEffect(() => {
    if (!isPharmacist) return;
    let cancelled = false;

    const params = new URLSearchParams({ page: '1', limit: '10' });
    if (filterDe)     params.set('de',     filterDe);
    if (filterAte)    params.set('ate',    filterAte);
    if (filterStatus) params.set('status', filterStatus);

    setLoading(true);
    setPage(1);

    fetch(`${API_URL}/api/farmaceutico/consultas?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAppointments(data.items);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [isPharmacist, token, filterDe, filterAte, filterStatus]);

  // ── Fetch paciente com filtros (reinicia ao mudar filtro) ─────────────────
  useEffect(() => {
    if (isPharmacist) return;
    let cancelled = false;

    const params = new URLSearchParams({ page: '1', limit: '10' });
    if (filterDe)            params.set('de',          filterDe);
    if (filterAte)           params.set('ate',         filterAte);
    if (filterStatus)        params.set('status',      filterStatus);
    if (selectedPerson?.id)  params.set('dependentId', selectedPerson.id);

    setLoading(true);
    setPage(1);

    fetch(`${API_URL}/api/paciente/agendamentos?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAppointments(data.items);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [isPharmacist, token, filterDe, filterAte, filterStatus, selectedPerson?.id, refreshKey]);

  // Polling silencioso a cada 20s (paciente) — pausa quando aba está em segundo plano
  useEffect(() => {
    if (isPharmacist) return;
    const poll = async () => {
      if (document.hidden) return;
      const params = new URLSearchParams({ page: '1', limit: '10' });
      if (filterDe)            params.set('de',          filterDe);
      if (filterAte)           params.set('ate',         filterAte);
      if (filterStatus)        params.set('status',      filterStatus);
      if (selectedPerson?.id)  params.set('dependentId', selectedPerson.id);
      try {
        const res = await fetch(`${API_URL}/api/paciente/agendamentos?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setAppointments(data.items);
        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch {}
    };
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [isPharmacist, token, filterDe, filterAte, filterStatus, selectedPerson?.id]);

  // Atualiza o relógio local a cada 30s para recomputar "É agora" sem refetch
  useEffect(() => {
    if (isPharmacist) return;
    const id = setInterval(() => setAgoraNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [isPharmacist]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({ page: String(nextPage), limit: '10' });
    if (filterDe)            params.set('de',          filterDe);
    if (filterAte)           params.set('ate',         filterAte);
    if (filterStatus)        params.set('status',      filterStatus);
    if (selectedPerson?.id)  params.set('dependentId', selectedPerson.id);
    const loadMoreUrl = isPharmacist
      ? `${API_URL}/api/farmaceutico/consultas?${params}`
      : `${API_URL}/api/paciente/agendamentos?${params}`;
    try {
      const res = await fetch(loadMoreUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Handler cancelamento de fila ──────────────────────────────────────────
  const handleCancelFila = async () => {
    if (!confirmCancelFila) return;
    const { id, tipo } = confirmCancelFila;
    setCancellingFilaId(id);
    try {
      const endpoint = tipo === 'urgente'
        ? `${API_URL}/api/fila/urgente/${id}/cancelar`
        : `${API_URL}/api/fila/agendadas/${id}/cancelar`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelado' } : a));
        onCancelled?.();
        setCancelToast({ type: 'success', msg: 'Consulta cancelada. Créditos devolvidos ao seu saldo.' });
        setTimeout(() => setCancelToast(null), 4000);
      } else {
        setCancelToast({ type: 'error', msg: 'Não foi possível cancelar — tente novamente.' });
        setTimeout(() => setCancelToast(null), 4000);
      }
    } finally {
      setCancellingFilaId(null);
      setConfirmCancelFila(null);
    }
  };

  // ── Helpers "É agora" ────────────────────────────────────────────────────
  const isEAgora = (app) => {
    if (isPharmacist) return false;
    if (!['aceito', 'em_atendimento'].includes(app.status)) return false;
    if (!app.dataHora) return false;
    const dt = new Date(app.dataHora).getTime();
    return dt >= agoraNow - 30 * 60 * 1000 && dt <= agoraNow + 15 * 60 * 1000;
  };

  const countdownLabel = (dataHora) => {
    const diffMin = Math.round((new Date(dataHora).getTime() - agoraNow) / 60000);
    if (diffMin > 0) return `começa em ${diffMin} min`;
    return 'em andamento';
  };

  const sortedAppointments = isPharmacist
    ? appointments
    : [...appointments].sort((a, b) => {
        const aOk = isEAgora(a) ? 0 : 1;
        const bOk = isEAgora(b) ? 0 : 1;
        return aOk - bOk;
      });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full mt-8">

      {/* Modal: detalhes da consulta (paciente) */}
      {viewingDetalhes && (
        <ConsultaDetalhesPaciente
          id={viewingDetalhes.id}
          tipo={viewingDetalhes.tipo}
          onClose={() => setViewingDetalhes(null)}
          onCancelled={() => {
            setAppointments((prev) =>
              prev.map((a) => a.id === viewingDetalhes.id ? { ...a, status: 'cancelado' } : a)
            );
            onCancelled?.();
          }}
        />
      )}

      {/* Modal: visualizador de receita */}
      {viewingReceita && (
        <ReceitaViewer
          consultaId={viewingReceita.id}
          tipo={viewingReceita.tipo}
          data={viewingReceita.data}
          onClose={() => setViewingReceita(null)}
        />
      )}

      {/* Toast de resultado de cancelamento */}
      {cancelToast && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-semibold flex items-center gap-2 ${
          cancelToast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {cancelToast.type === 'success' ? '✓' : '✕'} {cancelToast.msg}
        </div>
      )}

      {/* Modal: confirmar cancelamento de fila (com reembolso) */}
      {confirmCancelFila && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmCancelFila(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Cancelar consulta?</h3>
            <p className="text-sm text-gray-600 mb-1">
              {confirmCancelFila.tipo === 'urgente'
                ? 'Atendimento urgente'
                : new Date(confirmCancelFila.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              O valor de{' '}
              <strong>R$ {(confirmCancelFila.creditoDebitado ?? 50).toFixed(2).replace('.', ',')}</strong>{' '}
              será devolvido ao seu saldo.
            </p>
            <p className="text-xs text-gray-400 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancelFila(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Voltar
              </button>
              <button onClick={handleCancelFila}
                disabled={cancellingFilaId === confirmCancelFila.id}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition">
                {cancellingFilaId === confirmCancelFila.id ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingConsulta && (
        <ConsultaModal
          id={viewingConsulta.id}
          tipo={viewingConsulta.tipo}
          modo="visualizacao"
          onClose={() => setViewingConsulta(null)}
        />
      )}

      <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Meus Agendamentos</h2>

      {/* Filtros — farmacêutico */}
      {isPharmacist && (
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">De</label>
            <input
              type="date"
              value={filterDe}
              onChange={(e) => setFilterDe(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Até</label>
            <input
              type="date"
              value={filterAte}
              onChange={(e) => setFilterAte(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
            >
              <option value="">Todos</option>
              <option value="em_atendimento">Em atendimento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
              <option value="expirado">Expirado</option>
            </select>
          </div>
          {(filterDe || filterAte || filterStatus) && (
            <button
              onClick={() => { setFilterDe(''); setFilterAte(''); setFilterStatus(''); }}
              className="text-xs text-gray-400 hover:text-gray-700 underline self-end mb-1"
            >
              Limpar filtros
            </button>
          )}
          {!loading && (
            <span className="text-xs text-gray-400 self-end mb-1">
              {total} {total === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
        </div>
      )}

      {/* Filtros — paciente apenas */}
      {!isPharmacist && (
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">De</label>
            <input
              type="date"
              value={filterDe}
              onChange={(e) => setFilterDe(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Até</label>
            <input
              type="date"
              value={filterAte}
              onChange={(e) => setFilterAte(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-400 outline-none bg-white"
            >
              <option value="">Todos</option>
              <option value="aguardando">Aguardando</option>
              <option value="aceito">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          {(filterDe || filterAte || filterStatus) && (
            <button
              onClick={() => { setFilterDe(''); setFilterAte(''); setFilterStatus(''); }}
              className="text-xs text-gray-400 hover:text-gray-700 underline self-end mb-1"
            >
              Limpar filtros
            </button>
          )}
          {!loading && (
            <span className="text-xs text-gray-400 self-end mb-1">
              {total} {total === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm italic py-4">Carregando...</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500 italic">
          {!isPharmacist && selectedPerson
            ? `Nenhuma consulta para ${selectedPerson.nome}.`
            : 'Nenhum agendamento encontrado.'}
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {sortedAppointments.map((app) => {
              const tipo            = app.tipo;
              const effectiveStatus = getEffectiveStatus(app);
              const statusCfg       = STATUS_CONFIG[effectiveStatus] ?? { label: effectiveStatus, cls: 'text-gray-500', dot: 'bg-gray-400' };
              const tipoBadge       = TIPO_BADGE[tipo];
              const dataHora        = app.dataHora;
              const nomeFarm        = app.farmaceutico?.name;
              const isCancelled     = app.status === 'cancelado';
              const canCancelFila   = !isPharmacist && ['aguardando', 'aceito'].includes(app.status) && app.status !== 'remarcacao_pendente';
              const eAgora          = !isPharmacist && isEAgora(app);

              return (
                <div
                  key={app.id}
                  style={eAgora ? { border: '2px solid #16a34a', borderRadius: 10, background: '#f0fdf4', boxShadow: '0 0 0 3px #bbf7d040' } : undefined}
                  className={eAgora ? 'p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition' : `p-4 border rounded-lg bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition ${isCancelled ? 'border-red-100 opacity-60' : 'border-gray-200'}`}
                >
                  <div className="flex-1 min-w-0">

                    {/* Badge "É agora!" */}
                    {eAgora && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: 20 }}>
                          ⚡ É agora!
                        </span>
                        {dataHora && (
                          <span style={{ fontSize: 12, color: '#16a34a' }}>{countdownLabel(dataHora)}</span>
                        )}
                      </div>
                    )}

                    {/* Cabeçalho: data + badge de tipo */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className={`font-bold ${eAgora ? 'text-green-800' : 'text-gray-800'} ${isCancelled ? 'line-through' : ''}`}>
                        {new Date(dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      {tipoBadge && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoBadge.cls}`}>
                          {tipoBadge.label}
                        </span>
                      )}
                    </div>

                    {/* Farmacêutico ou paciente */}
                    {isPharmacist ? (
                      <p className="text-sm text-gray-600">Paciente: {app.patient?.name ?? '—'}</p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          {nomeFarm ? `Farmacêutico(a): ${nomeFarm}` : 'Farmacêutico: aguardando atribuição'}
                        </p>
                      </>
                    )}

                    {/* Status com dot colorido */}
                    <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${statusCfg.dot}`} />
                      <span className={statusCfg.cls}>{statusCfg.label}</span>
                    </p>

                    {/* Crédito debitado (fila) */}
                    {app.creditoDebitado != null && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        R$ {app.creditoDebitado.toFixed(2).replace('.', ',')} debitados
                      </p>
                    )}

                    {/* Aviso de remarcação pendente */}
                    {!isPharmacist && app.status === 'remarcacao_pendente' && (
                      <p style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px', marginTop: 6, display: 'inline-block' }}>
                        📅 Farmacêutico propôs novo horário — veja os detalhes
                      </p>
                    )}

                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-2 shrink-0 flex-wrap">

                    {/* Ver detalhes (farmacêutico, fila) */}
                    {isPharmacist && (
                      <button
                        onClick={() => setViewingConsulta({ id: app.id, tipo })}
                        style={{
                          padding: '8px 14px',
                          background: 'white',
                          color: '#7c3aed',
                          border: '1.5px solid #ddd6fe',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        👁 Ver detalhes
                      </button>
                    )}

                    {/* Cancelar fila (paciente, aguardando ou aceito) */}
                    {canCancelFila && (
                      <button
                        onClick={() => setConfirmCancelFila(app)}
                        className="px-4 py-2 bg-white border border-red-200 text-red-500 font-bold rounded hover:bg-red-50 transition text-sm"
                      >
                        Cancelar
                      </button>
                    )}

                    {/* Detalhes (paciente) */}
                    {!isPharmacist && (
                      <button
                        onClick={() => setViewingDetalhes({ id: app.id, tipo })}
                        style={{
                          padding: '8px 14px', background: 'white',
                          color: '#6b7280', border: '1.5px solid #e5e7eb',
                          borderRadius: 8, fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Detalhes →
                      </button>
                    )}

                    {/* Ver receita (paciente, fila concluída com receita) */}
                    {!isPharmacist && app.status === 'concluido' &&
                      (Array.isArray(app.receita) && app.receita.length > 0 || app.receitaPdfUrl) && (
                      <button
                        onClick={() => setViewingReceita({ id: app.id, tipo, data: app })}
                        style={{
                          padding: '8px 14px', background: '#7c3aed', color: 'white',
                          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        📄 Ver receita
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carregar mais */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition text-gray-600"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyAppointments;
