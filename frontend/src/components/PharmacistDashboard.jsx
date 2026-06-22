import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import PharmacistProfileEditor from './PharmacistProfileEditor';
import WeekCalendar from './WeekCalendar';
import DocUploadForm from './DocUploadForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

const TABS = [
  { id: 'calendario', label: 'Calendário' },
  { id: 'agendadas',  label: 'Fila de Agendadas' },
  { id: 'urgentes',   label: 'Urgentes' },
  { id: 'consultas',  label: 'Consultas' },
  { id: 'perfil',     label: 'Meu Perfil' },
];

// ── Aba Calendário ────────────────────────────────────────────────────────────

const CalendarioTab = () => {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/appointments`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((appts) => {
        setAppointments(appts);
        setStats({
          total:     appts.length,
          concluido: appts.filter((a) => a.status === 'CONCLUIDO').length,
          agendado:  appts.filter((a) => a.status === 'AGENDADO').length,
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300 inline-block" />Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-300 inline-block" />Concluído</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />Aguard. pagamento</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />Cancelado</span>
      </div>
      <WeekCalendar appointments={appointments} />
    </div>
  );
};

// ── Aba Fila de Agendadas ────────────────────────────────────────────────────

const AgendadasTab = () => {
  const { token } = useAuth();
  const [fila, setFila] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState({});
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fila/agendadas?status=aguardando`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFila(await res.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const aceitar = async (id) => {
    setAccepting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/fila/agendadas/${id}/aceitar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFila((p) => p.filter((f) => f.id !== id));
        showToast('success', `Consulta aceita! Paciente: ${data.fila?.paciente?.name ?? ''}`);
      } else {
        showToast('error', data.error || 'Erro ao aceitar.');
      }
    } catch {
      showToast('error', 'Falha de conexão.');
    }
    setAccepting((p) => ({ ...p, [id]: false }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toast && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.text}
        </div>
      )}

      {fila.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhuma consulta agendada aguardando na fila.
        </div>
      ) : (
        fila.map((f) => (
          <div key={f.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{f.paciente?.name}</p>
              <p className="text-xs text-violet-600 font-medium mt-0.5">{fmtDateTime(f.dataHora)}</p>
              <p className="text-xs text-gray-400">{f.paciente?.email}</p>
            </div>
            <button
              onClick={() => aceitar(f.id)}
              disabled={accepting[f.id]}
              className="shrink-0 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {accepting[f.id] ? '...' : 'Aceitar'}
            </button>
          </div>
        ))
      )}

      <button
        onClick={load}
        className="text-xs text-gray-400 hover:text-gray-600 transition mt-1"
      >
        ↻ Atualizar lista
      </button>
    </div>
  );
};

// ── Aba Urgentes ─────────────────────────────────────────────────────────────

const UrgentesTab = () => {
  const { token } = useAuth();
  const [fila, setFila] = useState([]);
  const [accepting, setAccepting] = useState({});
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fila/urgentes?status=aguardando`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFila(await res.json());
    } catch {}
  }, [token]);

  // Polling a cada 5s
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const aceitar = async (id) => {
    setAccepting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/fila/urgente/${id}/aceitar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFila((p) => p.filter((f) => f.id !== id));
        showToast('success', `Atendimento aceito! Paciente: ${data.fila?.paciente?.name ?? ''}`);
      } else {
        showToast('error', data.error || 'Erro ao aceitar.');
        load(); // recarrega para ver se outra pessoa aceitou
      }
    } catch {
      showToast('error', 'Falha de conexão.');
    }
    setAccepting((p) => ({ ...p, [id]: false }));
  };

  const temUrgentes = fila.length > 0;

  return (
    <div className="space-y-3">
      {temUrgentes && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-2xl animate-pulse">🚨</span>
          <div>
            <p className="font-bold text-red-800 text-sm">
              {fila.length} paciente{fila.length > 1 ? 's' : ''} aguardando atendimento imediato
            </p>
            <p className="text-xs text-red-600 mt-0.5">Aceite um para iniciar o atendimento agora</p>
          </div>
        </div>
      )}

      {toast && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.text}
        </div>
      )}

      {fila.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhum paciente aguardando atendimento imediato.
          <p className="text-xs mt-1 text-gray-300">Atualizando automaticamente a cada 5s</p>
        </div>
      ) : (
        fila.map((f) => (
          <div key={f.id} className="bg-white border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{f.paciente?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Aguardando desde {fmtDateTime(f.criadoEm)}
              </p>
              <p className="text-xs text-gray-400">{f.paciente?.email}</p>
            </div>
            <button
              onClick={() => aceitar(f.id)}
              disabled={accepting[f.id]}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {accepting[f.id] ? '...' : 'Aceitar'}
            </button>
          </div>
        ))
      )}
    </div>
  );
};

// ── Dashboard principal ───────────────────────────────────────────────────────

const PharmacistDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('calendario');
  const [refreshing, setRefreshing] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);

  const isApproved = user?.pharmacistProfile?.isApproved;
  const docEnviado = Boolean(user?.pharmacistProfile?.urlDocCrf);

  // Ping automático de presença a cada 30s (apenas quando aprovado)
  useEffect(() => {
    if (!isApproved || !token) return;

    const sendPing = () => {
      fetch(`${API_URL}/api/farmaceutico/ping`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    };

    sendPing();
    const interval = setInterval(sendPing, 30000);
    return () => clearInterval(interval);
  }, [isApproved, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  const handleDocSuccess = async () => {
    setShowDocForm(false);
    await refreshUser();
  };

  return (
    <div className="w-full">
      {/* Status de aprovação */}
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
                <DocUploadForm onSuccess={handleDocSuccess} />
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">📋</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Enviar documentos</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        RG/CNH e carteira do CRF são necessários para ativação.
                      </p>
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

      {/* Tabs */}
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

      {/* Conteúdo */}
      {activeTab === 'calendario' && <CalendarioTab />}
      {activeTab === 'agendadas'  && <AgendadasTab />}
      {activeTab === 'urgentes'   && <UrgentesTab />}
      {activeTab === 'consultas'  && <MyAppointments />}
      {activeTab === 'perfil'     && <PharmacistProfileEditor />}
    </div>
  );
};

export default PharmacistDashboard;
