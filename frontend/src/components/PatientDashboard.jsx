import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import CheckoutPix from './CheckoutPix';
import PatientProfileForm from './PatientProfileForm';
import TriagemForm from './TriagemForm';
import { formatIdade } from '../utils/formatIdade.js';

const API_URL   = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PRECO_CONSULTA = 50;

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-orange-400 to-rose-500',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
];

const DEP_COLORS = [
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-indigo-400 to-blue-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-purple-500',
];

const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

const PARENTESCO_OPTS = [
  { value: '', label: 'Selecionar' },
  { value: 'filho_a', label: 'Filho(a)' },
  { value: 'conjuge', label: 'Cônjuge' },
  { value: 'pai_mae', label: 'Pai / Mãe' },
  { value: 'irmao_a', label: 'Irmão(ã)' },
  { value: 'outro', label: 'Outro' },
];

const PARENTESCO_LABEL = Object.fromEntries(
  PARENTESCO_OPTS.filter(o => o.value).map(o => [o.value, o.label])
);

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

const EMPTY_CADASTRO = { nome: '', dataNascimento: '', sexo: '', parentesco: '', aceito: false };

const PatientDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const [pharmacists, setPharmacists] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showWalletTopup, setShowWalletTopup] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [sistemaAberto, setSistemaAberto] = useState(null);
  const [sistemaMotivo, setSistemaMotivo] = useState(null);
  const [sistemaProximaAbertura, setSistemaProximaAbertura] = useState(null);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const [passarAgoraLoading, setPassarAgoraLoading] = useState(false);
  const [passarAgoraMsg, setPassarAgoraMsg] = useState(null);
  const urgentIdRef = useRef(null);
  const [addingCredito, setAddingCredito] = useState(false);
  const [creditoToast, setCreditoToast]   = useState(null);
  const [showTriagemUrgente, setShowTriagemUrgente] = useState(false);

  // ── Dependentes ─────────────────────────────────────────────────────────────
  const [dependentes, setDependentes] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null); // null = titular
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmDeleteInDropdown, setConfirmDeleteInDropdown] = useState(null);
  const [showCadastroModal, setShowCadastroModal] = useState(false);
  const [cadastroForm, setCadastroForm] = useState(EMPTY_CADASTRO);
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroError, setCadastroError] = useState('');
  const [cadastroFieldErrors, setCadastroFieldErrors] = useState({ nome: '', data: '' });
  const dropdownRef = useRef(null);

  const validarNome = (nome) => {
    const t = (nome ?? '').trim();
    if (!t) return 'Nome é obrigatório.';
    if (t.length < 5) return 'Informe o nome completo (mínimo 5 caracteres).';
    if (!/^[A-Za-zÀ-ÿ\s]+$/.test(t)) return 'Apenas letras e espaços são permitidos.';
    if (/(.)\1{3,}/iu.test(t)) return 'Informe o nome completo.';
    return '';
  };

  const validarData = (data) => {
    if (!data) return 'Data de nascimento é obrigatória.';
    const nasc = new Date(data);
    if (isNaN(nasc.getTime())) return 'Data inválida.';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (nasc >= hoje) return 'A data não pode ser hoje ou futura.';
    const limite = new Date(hoje); limite.setFullYear(limite.getFullYear() - 120);
    if (nasc < limite) return 'Idade máxima é 120 anos.';
    return '';
  };

  const fetchDependentes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/dependentes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDependentes(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { fetchDependentes(); }, [fetchDependentes]);

  const handleDeleteDependente = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/dependentes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmDeleteInDropdown(null);
        if (selectedPerson?.id === id) setSelectedPerson(null);
        await fetchDependentes();
      }
    } catch {}
  };

  const handleCadastroDependente = async () => {
    setCadastroError('');
    const erroNome = validarNome(cadastroForm.nome);
    const erroData = validarData(cadastroForm.dataNascimento);
    setCadastroFieldErrors({ nome: erroNome, data: erroData });
    if (erroNome || erroData) return;
    if (!cadastroForm.sexo) {
      setCadastroError('Selecione o sexo.');
      return;
    }
    if (!cadastroForm.aceito) {
      setCadastroError('Confirme a responsabilidade pelo dependente.');
      return;
    }
    setCadastroLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dependentes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: cadastroForm.nome.trim(),
          dataNascimento: cadastroForm.dataNascimento,
          sexo: cadastroForm.sexo,
          parentesco: cadastroForm.parentesco || null,
          aceitouResponsabilidade: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCadastroModal(false);
        setCadastroForm(EMPTY_CADASTRO);
        setCadastroFieldErrors({ nome: '', data: '' });
        await fetchDependentes();
        setSelectedPerson(data);
      } else {
        setCadastroError(data.error || 'Erro ao cadastrar dependente.');
      }
    } catch {
      setCadastroError('Falha de conexão. Tente novamente.');
    } finally {
      setCadastroLoading(false);
    }
  };

  // ── Perfil ─────────────────────────────────────────────────────────────────
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
    } catch {}
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
    try {
      const res = await fetch(`${API_URL}/api/sistema/aberto`);
      const d   = res.ok ? await res.json() : null;
      if (d) {
        setSistemaAberto(d.aberto);
        setSistemaMotivo(d.motivo ?? null);
        setSistemaProximaAbertura(d.proximaAbertura ?? null);
      }
    } catch {
      setSistemaAberto(true);
      setSistemaMotivo(null);
      setSistemaProximaAbertura(null);
    }
  }, []);

  useEffect(() => { fetchPharmacists(filter); }, [filter, fetchPharmacists]);
  useEffect(() => { fetchWalletBalance(); },    [fetchWalletBalance]);
  useEffect(() => { fetchSistemaAberto(); },    [fetchSistemaAberto]);

  useEffect(() => {
    const id = setInterval(fetchSistemaAberto, 60000);
    return () => clearInterval(id);
  }, [fetchSistemaAberto]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        fetchSistemaAberto();
        setAppointmentsRefreshKey((k) => k + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSistemaAberto]);

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

  // Fecha dropdown ao clicar fora ou pressionar Esc
  useEffect(() => {
    if (!dropdownOpen) return;
    const onMouseDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setConfirmDeleteInDropdown(null);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setConfirmDeleteInDropdown(null);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dropdownOpen]);

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

  const handlePassarAgora = async (triagem = null) => {
    setPassarAgoraLoading(true);
    setPassarAgoraMsg(null);
    try {
      const body = triagem ? { triagem } : {};
      if (selectedPerson) body.dependentId = selectedPerson.id;
      const res = await fetch(`${API_URL}/api/fila/urgente`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 402) {
        setPassarAgoraMsg({ type: 'credits', error: data.error });
      } else if (!res.ok) {
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
          setAppointmentsRefreshKey((k) => k + 1);
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

  // ── Seletor helpers ─────────────────────────────────────────────────────────
  const podeAdicionarMais = dependentes.filter(d => d.ativo).length < 6;

  return (
    <div className="space-y-6">
      {/* Sucesso de agendamento */}
      {bookedSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-green-600 font-bold text-lg">✓</span>
          <p className="text-sm font-semibold text-green-800">Consulta agendada com sucesso!</p>
        </div>
      )}

      {/* ── Seletor de perfis (dropdown) ────────────────────────────────────── */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Trigger */}
        <button
          onClick={() => { setDropdownOpen(o => !o); setConfirmDeleteInDropdown(null); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: 'white',
            border: dropdownOpen ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb',
            borderRadius: dropdownOpen ? '10px 10px 0 0' : 10,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {/* Avatar */}
          <span style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: selectedPerson
              ? `linear-gradient(135deg, ${DEP_COLORS[dependentes.findIndex(d => d.id === selectedPerson.id) % DEP_COLORS.length].replace('from-', '').replace(' to-', ',')})`
              : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white',
          }}>
            {initials(selectedPerson ? selectedPerson.nome : (user?.name || ''))}
          </span>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedPerson ? selectedPerson.nome : (user?.name || 'Minha conta')}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedPerson
                ? [PARENTESCO_LABEL[selectedPerson.parentesco], formatIdade(selectedPerson.dataNascimento)].filter(Boolean).join(' · ')
                : 'Titular da conta'}
            </p>
          </div>

          {/* Chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none"
            viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2.5}
            style={{ flexShrink: 0, transition: 'transform 0.15s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Painel suspenso */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'white', border: '1.5px solid #7c3aed', borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            overflow: 'hidden',
          }}>
            {/* Lista com scroll */}
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>

              {/* Linha do titular */}
              <button
                onClick={() => { setSelectedPerson(null); setDropdownOpen(false); setConfirmDeleteInDropdown(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', border: 'none', background: selectedPerson === null ? '#f5f3ff' : 'white',
                  cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'white',
                }}>
                  {initials(user?.name || '')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{user?.name || 'Minha conta'}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Titular da conta</p>
                </div>
                {selectedPerson === null && (
                  <span style={{ fontSize: 15, color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>✓</span>
                )}
              </button>

              {/* Linhas de dependentes */}
              {dependentes.map((dep, idx) => {
                const isSelected = selectedPerson?.id === dep.id;
                const isConfirming = confirmDeleteInDropdown === dep.id;
                const depColor = `linear-gradient(135deg, ${DEP_COLORS[idx % DEP_COLORS.length].replace('from-', '').replace(' to-', ',')})`;
                const idadeStr = formatIdade(dep.dataNascimento);
                const subtitulo = [PARENTESCO_LABEL[dep.parentesco], idadeStr].filter(Boolean).join(' · ');

                if (isConfirming) {
                  return (
                    <div key={dep.id} style={{
                      padding: '10px 14px', background: '#fef2f2',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
                        Excluir {dep.nome.split(' ')[0]}?
                      </span>
                      <button
                        onClick={() => setConfirmDeleteInDropdown(null)}
                        style={{ fontSize: 12, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDeleteDependente(dep.id)}
                        style={{ fontSize: 12, color: 'white', background: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Excluir
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={dep.id} style={{
                    display: 'flex', alignItems: 'center',
                    background: isSelected ? '#f5f3ff' : 'white',
                    borderBottom: '1px solid #f3f4f6',
                  }}>
                    <button
                      onClick={() => { setSelectedPerson(dep); setDropdownOpen(false); setConfirmDeleteInDropdown(null); }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: depColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'white',
                      }}>
                        {initials(dep.nome)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dep.nome}</p>
                        {subtitulo && <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{subtitulo}</p>}
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: 15, color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteInDropdown(dep.id); }}
                      title={`Excluir ${dep.nome}`}
                      style={{
                        padding: '11px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', color: '#d1d5db', fontSize: 16, flexShrink: 0,
                        display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Rodapé fixo */}
            <div style={{ borderTop: '1px solid #f3f4f6' }}>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setCadastroError('');
                  setCadastroForm(EMPTY_CADASTRO);
                  setShowCadastroModal(true);
                }}
                disabled={!podeAdicionarMais}
                style={{
                  width: '100%', padding: '11px 14px', border: 'none',
                  background: 'white', cursor: podeAdicionarMais ? 'pointer' : 'not-allowed',
                  textAlign: 'left', fontSize: 13, fontWeight: 600,
                  color: podeAdicionarMais ? '#7c3aed' : '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>➕</span>
                {podeAdicionarMais ? 'Cadastrar novo perfil' : 'Limite de 6 perfis atingido'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Banner de status do sistema — só exibe quando fechado */}
      {sistemaAberto === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-500 text-xl shrink-0">🕐</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Fora do horário de atendimento</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {sistemaProximaAbertura
                ? `Abre ${sistemaProximaAbertura.dia} às ${sistemaProximaAbertura.hora}`
                : (sistemaMotivo || 'Tente novamente mais tarde.')}
            </p>
          </div>
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
                    onClick={() => setShowTriagemUrgente(true)}
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

      {/* Modal: triagem para atendimento urgente */}
      {showTriagemUrgente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTriagemUrgente(false)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
          >
            <TriagemForm
              modoUrgente
              onBack={() => setShowTriagemUrgente(false)}
              onConfirm={(triagem) => {
                setShowTriagemUrgente(false);
                handlePassarAgora(triagem);
              }}
              pacienteNome={user?.name || ''}
              preSelectedPerson={selectedPerson}
              dependentes={dependentes}
            />
          </div>
        </div>
      )}

      {/* Modal: escolher data e horário + triagem */}
      {showDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDataModal(false); fetchWalletBalance(); }} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
          >
            <TriagemForm
              tipo="agendado"
              onBack={() => { setShowDataModal(false); fetchWalletBalance(); }}
              onBooked={() => {
                setBookedSuccess(true);
                setTimeout(() => setBookedSuccess(false), 4000);
                setAppointmentsRefreshKey((k) => k + 1);
              }}
              onAddCredits={() => { setShowDataModal(false); setShowWalletTopup(true); }}
              pacienteNome={user?.name || ''}
              preSelectedPerson={selectedPerson}
              dependentes={dependentes}
            />
          </div>
        </div>
      )}

      {/* Modal: cadastrar dependente */}
      {showCadastroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCadastroModal(false); setCadastroFieldErrors({ nome: '', data: '' }); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', margin: 0 }}>Adicionar perfil</h3>
              <button onClick={() => { setShowCadastroModal(false); setCadastroFieldErrors({ nome: '', data: '' }); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                  Nome completo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={cadastroForm.nome}
                  onChange={e => {
                    const v = e.target.value;
                    setCadastroForm(f => ({ ...f, nome: v }));
                    setCadastroFieldErrors(fe => ({ ...fe, nome: validarNome(v) }));
                  }}
                  placeholder="Nome do dependente"
                  style={{ width: '100%', boxSizing: 'border-box', border: cadastroFieldErrors.nome ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                />
                {cadastroFieldErrors.nome && (
                  <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4, marginBottom: 0 }}>{cadastroFieldErrors.nome}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                    Data de nascimento <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={cadastroForm.dataNascimento}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => {
                      const v = e.target.value;
                      setCadastroForm(f => ({ ...f, dataNascimento: v }));
                      setCadastroFieldErrors(fe => ({ ...fe, data: validarData(v) }));
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', border: cadastroFieldErrors.data ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                  />
                  {cadastroFieldErrors.data && (
                    <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4, marginBottom: 0 }}>{cadastroFieldErrors.data}</p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                    Sexo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={cadastroForm.sexo}
                    onChange={e => setCadastroForm(f => ({ ...f, sexo: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}
                  >
                    <option value="">Selecionar</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                  Parentesco
                </label>
                <select
                  value={cadastroForm.parentesco}
                  onChange={e => setCadastroForm(f => ({ ...f, parentesco: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}
                >
                  {PARENTESCO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
                <input
                  type="checkbox"
                  checked={cadastroForm.aceito}
                  onChange={e => setCadastroForm(f => ({ ...f, aceito: e.target.checked }))}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: '#7c3aed', flexShrink: 0 }}
                />
                Confirmo que sou responsável por este dependente e autorizo o uso desta plataforma em seu nome.
              </label>

              {cadastroError && (
                <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{cadastroError}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setShowCadastroModal(false)}
                  style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCadastroDependente}
                  disabled={cadastroLoading}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: cadastroLoading ? 'not-allowed' : 'pointer', opacity: cadastroLoading ? 0.6 : 1 }}
                >
                  {cadastroLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My appointments */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">Minhas consultas</h3>
        <MyAppointments onCancelled={fetchWalletBalance} selectedPerson={selectedPerson} refreshKey={appointmentsRefreshKey} />
      </div>
    </div>
  );
};

export default PatientDashboard;
