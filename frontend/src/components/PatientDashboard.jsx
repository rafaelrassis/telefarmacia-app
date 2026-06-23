import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import CheckoutPix from './CheckoutPix';
import PatientProfileForm from './PatientProfileForm';
import AgendarModal from './AgendarModal';
import AgendamentoComDataModal from './AgendamentoComDataModal';

const API_URL   = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PRECO_CONSULTA = 50;

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-orange-400 to-rose-500',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
];

const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

const ScheduleSummary = ({ weeklySchedule }) => {
  if (!weeklySchedule?.length) return null;
  const active = weeklySchedule.filter((d) => d.isActive);
  if (!active.length) return null;
  const days = active.map((d) => DOW_SHORT[d.dayOfWeek]).join(' · ');
  const first = active[0];
  return (
    <p className="text-xs text-slate-500 mb-3">
      <span className="font-medium">{days}</span>
      {first && <span className="text-slate-400"> · {first.startTime}–{first.endTime}</span>}
    </p>
  );
};

const PharmacistCard = ({ pharm, index, onAgendar, showToday }) => {
  const profile = pharm.pharmacistProfile;
  const count = pharm._count?.appointmentsAsPharmacist ?? 0;
  const nextSlot = pharm.availabilities?.[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition duration-150 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          {initials(pharm.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{pharm.name}</p>
          </div>
          <p className="text-xs text-gray-400">CRF {profile?.crfNumber}/{profile?.crfUF}</p>
          {pharm.avgNota && (
            <p className="text-xs text-yellow-600 font-semibold mt-0.5">
              ★ {pharm.avgNota.toFixed(1)}
              <span className="text-gray-400 font-normal"> ({pharm.totalAvaliacoes})</span>
            </p>
          )}
        </div>
        {count > 0 && (
          <span className="text-xs text-gray-400 shrink-0">{count} consultas</span>
        )}
      </div>

      {profile?.bio && (
        <p className="text-xs text-gray-500 italic mb-3 line-clamp-2">"{profile.bio}"</p>
      )}

      {profile?.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {profile.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      <ScheduleSummary weeklySchedule={pharm.weeklySchedule} />

      {showToday && nextSlot && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded-lg mb-3">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Disponível hoje às {fmtTime(nextSlot.dateTime)}
        </div>
      )}

      <button
        onClick={onAgendar}
        className="mt-auto w-full text-sm font-bold py-2 rounded-lg transition bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white"
      >
        Agendar Consulta
      </button>
    </div>
  );
};

const PatientDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const [pharmacists, setPharmacists] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'today'
  const [loading, setLoading] = useState(true);
  const [showWalletTopup, setShowWalletTopup] = useState(false);
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [sistemaAberto, setSistemaAberto] = useState(null);
  const [sistemaAbertoLoading, setSistemaAbertoLoading] = useState(false);
  const [passarAgoraLoading, setPassarAgoraLoading] = useState(false);
  const [passarAgoraMsg, setPassarAgoraMsg] = useState(null); // { type: 'waiting'|'success'|'unavailable'|'error'|'credits', ... }
  const urgentIdRef = useRef(null);
  const [addingCredito, setAddingCredito] = useState(false);
  const [creditoToast, setCreditoToast]   = useState(null);

  const hasProfile = Boolean(user?.pacienteProfile);

  const fetchWalletBalance = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/carteira/saldo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.saldo_disponivel ?? 0);
      }
    } catch {
      // silent — wallet is optional
    }
  }, [token]);

  const fetchPharmacists = useCallback(async (mode = 'all') => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/pharmacists`;
      if (mode === 'today') url += '?today=true';
      const res = await fetch(url);
      if (res.ok) setPharmacists(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSistemaAberto = useCallback(async () => {
    setSistemaAbertoLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/sistema/aberto`);
      const d   = res.ok ? await res.json() : null;
      if (d) setSistemaAberto(d.aberto);
    } catch {
      setSistemaAberto(true);
    } finally {
      setSistemaAbertoLoading(false);
    }
  }, []);

  useEffect(() => { fetchPharmacists(filter); }, [filter, fetchPharmacists]);
  useEffect(() => { fetchWalletBalance(); },    [fetchWalletBalance]);
  useEffect(() => { fetchSistemaAberto(); },    [fetchSistemaAberto]);

  // Polling leve a cada 60s para detectar mudanças de status do sistema
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/sistema/aberto`);
        if (res.ok) {
          const d = await res.json();
          setSistemaAberto((prev) => (prev !== d.aberto ? d.aberto : prev));
        }
      } catch {}
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Restaura estado de urgência ativa após reload de página
  useEffect(() => {
    if (!token) return;
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/fila/urgente/ativa`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.urgente) {
          urgentIdRef.current = data.urgente.id;
          if (data.urgente.status === 'aguardando') {
            setPassarAgoraMsg({ type: 'waiting' });
          } else if (data.urgente.status === 'aceito') {
            setPassarAgoraMsg({ type: 'success', farmaceutico: data.urgente.farmaceutico });
          }
        }
      } catch {}
    };
    check();
  }, [token]);

  // MANDATORY: profile completion blocks dashboard access until filled
  if (!hasProfile) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
          <p className="text-base font-bold text-amber-800 mb-1">Complete seu cadastro</p>
          <p className="text-sm text-amber-700">
            Preencha seus dados pessoais para acessar o sistema de agendamentos e cumprir os requisitos da LGPD.
          </p>
        </div>
        <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <PatientProfileForm onClose={async () => { await refreshUser(); }} />
        </div>
      </div>
    );
  }

  // Recarga de créditos (top-up flow)
  if (showWalletTopup) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowWalletTopup(false)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition"
        >
          ← Voltar
        </button>
        <CheckoutPix
          onSuccess={() => {
            setShowWalletTopup(false);
            fetchWalletBalance();
          }}
          onCancel={() => setShowWalletTopup(false)}
        />
      </div>
    );
  }

  const handleAdicionarCredito = async () => {
    setAddingCredito(true);
    try {
      const res = await fetch(`${API_URL}/api/creditos/adicionar-teste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor: 50 }),
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(data.novo_saldo);
        setCreditoToast('R$ 50,00 adicionados!');
        setTimeout(() => setCreditoToast(null), 3000);
      }
    } catch {}
    finally { setAddingCredito(false); }
  };

  const handleCancelarUrgente = async () => {
    const id = urgentIdRef.current;
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/fila/urgente/${id}/cancelar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        urgentIdRef.current = null;
        setPassarAgoraMsg(null);
        fetchWalletBalance();
      }
    } catch {}
  };

  const handlePassarAgora = async () => {
    setPassarAgoraLoading(true);
    setPassarAgoraMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/fila/urgente`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.status === 402) {
        setPassarAgoraMsg({ type: 'credits', error: data.error });
      } else if (!res.ok) {
        // Se já tem uma solicitação ativa, retoma o polling
        if (data.id) {
          urgentIdRef.current = data.id;
          setPassarAgoraMsg({ type: 'waiting' });
        } else {
          setPassarAgoraMsg({ type: 'error', mensagem: data.error || 'Erro ao solicitar atendimento.' });
        }
      } else {
        urgentIdRef.current = data.id;
        setPassarAgoraMsg({ type: 'waiting' });
      }
    } catch {
      setPassarAgoraMsg({ type: 'error', mensagem: 'Falha de conexão. Tente novamente.' });
    } finally {
      setPassarAgoraLoading(false);
    }
  };

  // Polling: verifica status da solicitação urgente a cada 5s
  useEffect(() => {
    if (passarAgoraMsg?.type !== 'waiting') return;

    const poll = async () => {
      const id = urgentIdRef.current;
      if (!id) return;
      try {
        const res = await fetch(`${API_URL}/api/fila/urgente/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'aceito') {
          urgentIdRef.current = null;
          setPassarAgoraMsg({ type: 'success', farmaceutico: data.farmaceutico });
          fetchWalletBalance();
        } else if (data.status === 'expirado') {
          urgentIdRef.current = null;
          setPassarAgoraMsg({
            type: 'unavailable',
            mensagem: 'Nenhum farmacêutico disponível no momento. Seus créditos foram devolvidos.',
          });
          fetchWalletBalance();
        } else if (data.status === 'cancelado') {
          urgentIdRef.current = null;
          setPassarAgoraMsg(null);
          fetchWalletBalance();
        }
      } catch {}
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [passarAgoraMsg?.type, token, fetchWalletBalance]);

  return (
    <div className="space-y-6">
      {/* Modal de agendamento automático */}
      {showAgendarModal && (
        <AgendarModal
          onClose={() => { setShowAgendarModal(false); fetchWalletBalance(); }}
          onBooked={() => {
            setBookedSuccess(true);
            setTimeout(() => setBookedSuccess(false), 4000);
          }}
          onAddCredits={() => { setShowAgendarModal(false); setShowWalletTopup(true); }}
        />
      )}

      {/* Sucesso de agendamento */}
      {bookedSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-green-600 font-bold text-lg">✓</span>
          <p className="text-sm font-semibold text-green-800">Consulta agendada com sucesso!</p>
        </div>
      )}

      {/* Banner de status do sistema */}
      {sistemaAberto === false && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-red-500 text-xl shrink-0">🔒</span>
            <div>
              <p className="text-sm font-semibold text-red-800">Agendamentos temporariamente suspensos</p>
              <p className="text-xs text-red-600 mt-0.5">O sistema está fechado no momento. Tente novamente mais tarde.</p>
            </div>
          </div>
          <button
            onClick={fetchSistemaAberto}
            disabled={sistemaAbertoLoading}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 px-3 py-1.5 rounded-lg transition"
          >
            {sistemaAbertoLoading
              ? <span className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              : '🔄'}
            Atualizar
          </button>
        </div>
      )}
      {sistemaAberto === true && (
        <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
            <p className="text-xs text-green-700 font-medium">Sistema aberto para agendamentos</p>
          </div>
          <button
            onClick={fetchSistemaAberto}
            disabled={sistemaAbertoLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50 px-3 py-1.5 rounded-lg transition"
          >
            {sistemaAbertoLoading
              ? <span className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              : '🔄'}
            Atualizar
          </button>
        </div>
      )}

      {/* Dois botões de agendamento */}
      {sistemaAberto !== false && (
        <>
          {(() => {
            const saldoInsuficiente = walletBalance !== null && walletBalance < PRECO_CONSULTA;
            const urgenteBloqueado  = passarAgoraMsg?.type === 'waiting';
            return (
              <>
                <div style={{ display: 'flex', gap: '12px', margin: '16px 0' }}>
                  <button
                    onClick={() => setShowDataModal(true)}
                    disabled={saldoInsuficiente}
                    title={saldoInsuficiente ? 'Saldo insuficiente — adicione créditos para continuar' : undefined}
                    style={{
                      flex: 1,
                      background: '#2563eb',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      cursor: saldoInsuficiente ? 'not-allowed' : 'pointer',
                      opacity: saldoInsuficiente ? 0.55 : 1,
                    }}
                  >
                    📅 Agendar Consulta
                  </button>
                  <button
                    onClick={handlePassarAgora}
                    disabled={passarAgoraLoading || saldoInsuficiente || urgenteBloqueado}
                    title={
                      urgenteBloqueado  ? 'Você já tem um atendimento urgente em andamento' :
                      saldoInsuficiente ? 'Saldo insuficiente — adicione créditos para continuar' :
                      undefined
                    }
                    style={{
                      flex: 1,
                      background: 'white',
                      color: '#2563eb',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid #2563eb',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      cursor: (passarAgoraLoading || saldoInsuficiente || urgenteBloqueado) ? 'not-allowed' : 'pointer',
                      opacity: (passarAgoraLoading || saldoInsuficiente || urgenteBloqueado) ? 0.55 : 1,
                    }}
                  >
                    {passarAgoraLoading ? '...' : '⚡ Quero Passar Agora'}
                  </button>
                </div>
                {saldoInsuficiente && (
                  <p style={{ fontSize: '13px', color: '#dc2626', textAlign: 'center', marginTop: '-8px', marginBottom: '4px' }}>
                    Saldo insuficiente — adicione créditos para continuar
                  </p>
                )}
              </>
            );
          })()}

          {/* Resultado inline do "Quero Passar Agora" */}
          {passarAgoraMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: passarAgoraMsg.type === 'success' ? '#f0fdf4'
                        : passarAgoraMsg.type === 'waiting'  ? '#eff6ff'
                        : '#fef2f2',
              border: `1px solid ${
                passarAgoraMsg.type === 'success' ? '#86efac'
                : passarAgoraMsg.type === 'waiting' ? '#bfdbfe'
                : '#fca5a5'
              }`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                {passarAgoraMsg.type === 'waiting' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: '2px solid #2563eb', borderTopColor: 'transparent',
                      animation: 'spin 0.8s linear infinite', flexShrink: 0,
                    }} />
                    <p style={{ fontSize: '14px', color: '#1d4ed8', margin: 0, flex: 1 }}>
                      Aguardando farmacêutico... (verificando a cada 5s)
                    </p>
                    <button
                      onClick={handleCancelarUrgente}
                      style={{
                        fontSize: '13px', color: '#6b7280', background: 'white',
                        border: '1px solid #d1d5db', borderRadius: '6px',
                        padding: '4px 12px', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {passarAgoraMsg.type === 'success' && (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', margin: '0 0 4px 0' }}>
                      ✓ Farmacêutico aceitou!
                    </p>
                    <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
                      {passarAgoraMsg.farmaceutico} está pronto para seu atendimento.
                    </p>
                  </>
                )}
                {(passarAgoraMsg.type === 'unavailable' || passarAgoraMsg.type === 'error') && (
                  <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>
                    {passarAgoraMsg.mensagem}
                  </p>
                )}
                {passarAgoraMsg.type === 'credits' && (
                  <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>
                    {passarAgoraMsg.error}{' '}
                    <button
                      onClick={() => setShowWalletTopup(true)}
                      style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Adicionar créditos
                    </button>
                  </p>
                )}
              </div>
              {passarAgoraMsg.type !== 'waiting' && (
                <button
                  onClick={() => { setPassarAgoraMsg(null); urgentIdRef.current = null; }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '20px', lineHeight: 1, padding: 0, flexShrink: 0 }}
                >
                  ×
                </button>
              )}
            </div>
          )}
        </>
      )}


      {/* Carteira de créditos */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v2M3 9h18l-1.5 10H4.5L3 9z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Carteira de créditos</p>
            <p className="text-sm font-bold text-gray-900">
              {walletBalance === null
                ? '...'
                : `R$ ${walletBalance.toFixed(2).replace('.', ',')}`}
            </p>
            {creditoToast && (
              <p className="text-xs text-green-600 font-semibold mt-0.5">{creditoToast}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleAdicionarCredito}
          disabled={addingCredito}
          className="shrink-0 text-xs font-bold bg-violet-100 hover:bg-violet-200 disabled:opacity-50 text-violet-700 px-4 py-2 rounded-lg transition"
        >
          {addingCredito ? '...' : '+ Adicionar créditos'}
        </button>
      </div>

      {/* Modal: escolher data e horário */}
      {showDataModal && (
        <AgendamentoComDataModal
          onClose={() => { setShowDataModal(false); fetchWalletBalance(); }}
          onBooked={() => {
            setBookedSuccess(true);
            setTimeout(() => setBookedSuccess(false), 4000);
          }}
          onAddCredits={() => { setShowDataModal(false); setShowWalletTopup(true); }}
        />
      )}

      {/* My appointments */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">Minhas consultas</h3>
        <MyAppointments onCancelled={fetchWalletBalance} />
      </div>
    </div>
  );
};

export default PatientDashboard;
