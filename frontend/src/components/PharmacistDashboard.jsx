import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import PharmacistProfileEditor from './PharmacistProfileEditor';
import WeekCalendar from './WeekCalendar';
import DocUploadForm from './DocUploadForm';
import ConsultaModal from './ConsultaModal';
import GanhosTab from './GanhosTab';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

const timeUntil = (iso) => {
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'passou';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `em ${Math.floor(h / 24)}d`;
  if (h > 0)   return `em ${h}h${m > 0 ? `${m}min` : ''}`;
  return `em ${m}min`;
};

const timeSince = (iso) => {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora mesmo';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  return `há ${h}h${m % 60 > 0 ? `${m % 60}min` : ''}`;
};

const fmtEntrou = (iso) => {
  const d    = new Date(iso);
  const hoje = new Date();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoje.toDateString()) return `hoje às ${hora}`;
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return `ontem às ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
};

const useIsLg = () => {
  const [isLg, setIsLg] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsLg(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isLg;
};

// ── Toast local ───────────────────────────────────────────────────────────────

const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return [toast, show];
};

const ToastBanner = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
      toast.type === 'success'
        ? 'bg-green-50 text-green-800 border-green-200'
        : 'bg-red-50 text-red-800 border-red-200'
    }`}>
      {toast.text}
    </div>
  );
};

// ── Painel esquerdo: Fila de Agendamentos (polling 30s) ───────────────────────

const FilaPanel = ({ onAccepted, onCardClick, hasEmAtendimento }) => {
  const { token } = useAuth();
  const [fila, setFila]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [accepting, setAccepting] = useState({});
  const [toast, showToast]      = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fila/agendadas?status=aguardando`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFila(await res.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const aceitar = async (id, nomePaciente) => {
    setAccepting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/fila/agendadas/${id}/aceitar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFila((p) => p.filter((f) => f.id !== id));
        showToast('success', `✅ Consulta aceita! Paciente: ${data.fila?.paciente?.name ?? nomePaciente}`);
        onAccepted?.();
      } else if (res.status === 409) {
        showToast('error', 'Consulta aceita por outro farmacêutico.');
        load();
      } else {
        showToast('error', data.error || 'Erro ao aceitar.');
      }
    } catch {
      showToast('error', 'Falha de conexão.');
    }
    setAccepting((p) => ({ ...p, [id]: false }));
  };

  const sorted = [...fila].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 min-h-[220px]">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-base">📋 Fila de Agendamentos</h2>
        <span className="text-xs text-gray-400">↻ 30s</span>
      </div>

      <ToastBanner toast={toast} />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Nenhuma consulta aguardando</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-80">
          {sorted.map((f) => (
            <div
              key={f.id}
              onClick={() => onCardClick?.({ id: f.id, tipo: 'agendada' })}
              className={`border border-gray-100 rounded-xl p-3.5 flex items-start justify-between gap-3 ${onCardClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 text-sm truncate">{f.paciente?.name}</p>
                <p className="text-xs text-violet-600 font-medium mt-0.5">{fmtDateTime(f.dataHora)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeUntil(f.dataHora)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); aceitar(f.id, f.paciente?.name); }}
                disabled={accepting[f.id] || hasEmAtendimento}
                title={hasEmAtendimento ? 'Finalize o atendimento atual primeiro' : undefined}
                className="shrink-0 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                {accepting[f.id] ? '...' : '✅ Aceitar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Painel direito: Urgentes (polling 5s) ─────────────────────────────────────

const UrgentesPanel = ({ onAccepted, onCardClick, hasEmAtendimento }) => {
  const { token } = useAuth();
  const [fila, setFila]         = useState([]);
  const [accepting, setAccepting] = useState({});
  const [toast, showToast]      = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fila/urgentes?status=aguardando`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFila(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const aceitar = async (id, nomePaciente) => {
    console.log('[UrgentesPanel] aceitar → id:', id, '| nomePaciente:', nomePaciente);
    setAccepting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/fila/urgente/${id}/aceitar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('[UrgentesPanel] resposta → status:', res.status, '| body:', data);
      if (res.ok) {
        setFila((p) => p.filter((f) => f.id !== id));
        showToast('success', `🚨 Atendimento aceito! Paciente: ${data.fila?.paciente?.name ?? nomePaciente}`);
        onAccepted?.();
      } else if (res.status === 409) {
        showToast('error', 'Consulta já foi atendida por outro farmacêutico.');
        load();
      } else {
        showToast('error', data.error || 'Erro ao aceitar.');
      }
    } catch (err) {
      console.error('[UrgentesPanel] catch →', err);
      showToast('error', 'Falha de conexão.');
    }
    setAccepting((p) => ({ ...p, [id]: false }));
  };

  const temUrgentes = fila.length > 0;

  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-4 min-h-[220px] border-2 transition-colors duration-300 ${
      temUrgentes ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold text-base ${temUrgentes ? 'text-red-800' : 'text-gray-800'}`}>
          ⚡ Urgências
        </h2>
        <span className="text-xs text-gray-400">↻ 5s</span>
      </div>

      <ToastBanner toast={toast} />

      {temUrgentes ? (
        <div className="space-y-3 overflow-y-auto max-h-80">
          {fila.map((f) => (
            <div key={f.id} className="relative">
              {/* Anel pulsante ao redor do card */}
              <div className="absolute -inset-0.5 rounded-xl border-2 border-red-400 animate-ping opacity-25 pointer-events-none" />
              <div
                onClick={() => onCardClick?.({ id: f.id, tipo: 'urgente' })}
                className={`relative bg-white border-2 border-red-300 rounded-xl p-4 flex flex-col gap-3 ${onCardClick ? 'cursor-pointer hover:bg-red-50/30 transition-colors' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 animate-bounce" style={{ animationDuration: '1.2s' }}>🚨</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-red-800 text-sm leading-tight">
                      Paciente aguardando atendimento URGENTE!
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-1.5 truncate">{f.paciente?.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">aguardando {timeSince(f.criadoEm)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); aceitar(f.id, f.paciente?.name); }}
                  disabled={accepting[f.id] || hasEmAtendimento}
                  title={hasEmAtendimento ? 'Finalize o atendimento atual primeiro' : undefined}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition"
                >
                  {accepting[f.id] ? 'Aceitando...' : '🚨 Atender Agora'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <p className="text-sm text-gray-400">Nenhuma urgência no momento</p>
          <p className="text-xs text-gray-300">Verificando a cada 5s</p>
        </div>
      )}
    </div>
  );
};

// ── Painel: Urgentes Aceitas (polling 30s) ────────────────────────────────────

const UrgentesAceitasPanel = ({ onCardClick, refreshTrigger }) => {
  const { token } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);
  const timerRef              = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/urgentes-aceitas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load, refreshTrigger]);

  // Atualiza elapsed a cada 30s sem refetch
  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  const STATUS_CFG = {
    aceito:         { label: 'Aceito',          bg: '#dbeafe', color: '#1d4ed8' },
    em_atendimento: { label: 'Em atendimento',  bg: '#dcfce7', color: '#15803d', pulse: true },
  };

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #e5e7eb',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      minHeight: '200px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontWeight: '700', fontSize: '15px', color: '#111827', margin: 0 }}>
          ⚡ Urgentes Aceitas
        </h2>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>↻ 30s</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
            Nenhuma urgência aceita
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '480px' }}>
          {items.map((item) => {
            const cfg = STATUS_CFG[item.status] ?? { label: item.status, bg: '#f3f4f6', color: '#374151' };
            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#fafafa',
                }}
              >
                {/* Nome + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <p style={{ fontWeight: '600', fontSize: '14px', color: '#111827', margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {item.pacienteNome}
                  </p>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    background: cfg.bg,
                    color: cfg.color,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {cfg.label}
                    {cfg.pulse && ' •'}
                  </span>
                </div>

                {/* Horário + elapsed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    Entrou: {fmtEntrou(item.criadoEm)}
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                    {timeSince(item.criadoEm)}
                  </p>
                </div>

                {/* Botão */}
                <button
                  onClick={() => onCardClick?.({ id: item.id, tipo: 'urgente' })}
                  style={{
                    width: '100%',
                    background: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Abrir atendimento
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Aba Calendário ────────────────────────────────────────────────────────────

const CalendarioTab = ({ refreshTrigger, onEventClick }) => {
  const { token } = useAuth();
  const [legacyAppts, setLegacyAppts] = useState([]);
  const [filaEvents, setFilaEvents]   = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/appointments`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/farmaceutico/calendario`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : [])),
    ]).then(([appts, calendario]) => {
      setLegacyAppts(appts);
      setStats({
        total:     appts.length,
        concluido: appts.filter((a) => a.status === 'CONCLUIDO').length,
        agendado:  appts.filter((a) => a.status === 'AGENDADO').length,
      });
      // Normaliza para o formato que WeekCalendar espera
      setFilaEvents(
        calendario.map((f) => ({
          id:            f.id,
          dateTime:      f.data_hora,
          patient:       { name: f.paciente_nome },
          status:        f.status === 'em_atendimento' ? 'FILA_EM_ATENDIMENTO' :
                         f.tipo === 'urgente' ? 'FILA_URGENTE' : 'FILA_AGENDADA',
          googleMeetLink: null,
          _tipo:         f.tipo,
        }))
      );
    }).finally(() => setLoading(false));
  }, [token, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Contadores */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-violet-700">{stats.concluido}</p>
            <p className="text-xs text-gray-500 mt-1">Consultas realizadas</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.agendado}</p>
            <p className="text-xs text-gray-500 mt-1">Agendadas</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block" />Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-50 border border-green-300 inline-block" />Concluído</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" />Aguard. pagamento</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />Cancelado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-500 inline-block" />Agendada aceita</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-400 inline-block" />Urgente aceita</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-100 border border-teal-500 inline-block" />Em atendimento</span>
      </div>

      {/* Calendário com todos os eventos */}
      <WeekCalendar appointments={[...legacyAppts, ...filaEvents]} onEventClick={onEventClick} />
    </div>
  );
};

// ── Dashboard principal ───────────────────────────────────────────────────────

const TABS = [
  { id: 'calendario', label: 'Calendário' },
  { id: 'consultas',  label: 'Consultas'  },
  { id: 'ganhos',     label: '💰 Ganhos'  },
];

const PharmacistDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const isLg = useIsLg();
  const [activeTab, setActiveTab]         = useState('calendario');
  const [refreshing, setRefreshing]       = useState(false);
  const [showDocForm, setShowDocForm]     = useState(false);
  const [calendarTrigger, setCalendarTrigger] = useState(0);
  const [consultaAlvo, setConsultaAlvo]       = useState(null);
  const [hasEmAtendimento, setHasEmAtendimento] = useState(false);

  const isApproved = user?.pharmacistProfile?.isApproved;
  const docEnviado = Boolean(user?.pharmacistProfile?.urlDocCrf);

  // Verifica se o farmacêutico tem alguma consulta em_atendimento (bloqueia aceitar nova)
  const checkEmAtendimento = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/consultas?status=em_atendimento&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHasEmAtendimento((data.total ?? 0) > 0);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    checkEmAtendimento();
  }, [checkEmAtendimento, calendarTrigger]);

  // Dispara refresh do calendário sempre que uma consulta for aceita ou atualizada
  const onConsultaAceita = useCallback(() => {
    setCalendarTrigger((t) => t + 1);
  }, []);

  const handleCardClick    = useCallback(({ id, tipo }) => setConsultaAlvo({ id, tipo }), []);
  const handleEventClick   = useCallback((appt) => {
    if (!appt._tipo) return;
    setConsultaAlvo({ id: appt.id, tipo: appt._tipo });
  }, []);
  const handleModalClose   = useCallback(() => setConsultaAlvo(null), []);
  const handleModalUpdated = useCallback(() => setCalendarTrigger((t) => t + 1), []);

  // Ping de presença a cada 30s
  useEffect(() => {
    if (!isApproved || !token) return;
    const sendPing = () => {
      fetch(`${API_URL}/api/farmaceutico/ping`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    };
    sendPing();
    const id = setInterval(sendPing, 30000);
    return () => clearInterval(id);
  }, [isApproved, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  return (
    <div className="w-full">

      {/* Banner de aprovação pendente */}
      {!isApproved && (
        <div className="mb-5 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 mt-0.5">⏳</span>
              <div>
                <p className="font-semibold text-amber-800 text-sm">Conta aguardando aprovação</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {docEnviado
                    ? 'Documentos enviados. Um administrador irá analisar e ativar seu cadastro em breve.'
                    : 'Envie seus documentos para que um administrador possa analisar e ativar seu cadastro.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0 text-xs text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition disabled:opacity-50"
            >
              {refreshing ? 'Verificando...' : 'Verificar status'}
            </button>
          </div>

          {!docEnviado && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              {showDocForm ? (
                <DocUploadForm onSuccess={async () => { setShowDocForm(false); await refreshUser(); }} />
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">📋</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Enviar documentos</p>
                      <p className="text-xs text-gray-500 mt-0.5">RG/CNH e carteira do CRF são necessários para ativação.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDocForm(true)}
                    className="shrink-0 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Duas colunas: Fila + Urgentes (sempre visíveis quando aprovado) ── */}
      {isApproved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FilaPanel     onAccepted={onConsultaAceita} onCardClick={handleCardClick} hasEmAtendimento={hasEmAtendimento} />
          <UrgentesPanel onAccepted={onConsultaAceita} onCardClick={handleCardClick} hasEmAtendimento={hasEmAtendimento} />
        </div>
      )}

      {/* ── Abas ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-violet-700 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'calendario' && (
        <div style={isLg
          ? { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }
          : { display: 'flex', flexDirection: 'column', gap: '16px' }
        }>
          <div style={{ minWidth: 0 }}>
            <CalendarioTab refreshTrigger={calendarTrigger} onEventClick={handleEventClick} />
          </div>
          <UrgentesAceitasPanel onCardClick={handleCardClick} refreshTrigger={calendarTrigger} />
        </div>
      )}
      {activeTab === 'consultas'  && <MyAppointments />}
      {activeTab === 'ganhos'     && <GanhosTab />}
      {activeTab === 'perfil'     && <PharmacistProfileEditor />}

      {consultaAlvo && (
        <ConsultaModal
          id={consultaAlvo.id}
          tipo={consultaAlvo.tipo}
          onClose={handleModalClose}
          onUpdated={handleModalUpdated}
        />
      )}
    </div>
  );
};

export default PharmacistDashboard;
