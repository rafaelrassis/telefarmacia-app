import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import CheckoutPix from './CheckoutPix';
import PatientProfileForm from './PatientProfileForm';
import TriagemForm from './TriagemForm';
import { formatIdade } from '../utils/formatIdade.js';
import ConsultaDetalhesPaciente from './ConsultaDetalhesPaciente';
import OnboardingSlider from './OnboardingSlider';
import TermoConsentimento from './TermoConsentimento';
import MeusDocumentos from './MeusDocumentos';
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '../utils/push';

const API_URL   = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PRECO_CONSULTA = 50;

const toLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

const DEP_COLORS = [
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-indigo-400 to-blue-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-purple-500',
];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const DIAS_SEMANA = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const fmtWhen = (iso) => {
  const dt = new Date(iso);
  const now = new Date();
  const diffMs = dt.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffMin < 60) return `em ${diffMin} min`;
  const diffDays = Math.round(
    (new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    / 86400000
  );
  if (diffDays === 0) return `hoje às ${hora}`;
  if (diffDays === 1) return `amanhã às ${hora}`;
  return `${DIAS_SEMANA[dt.getDay()]} às ${hora}`;
};

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

const EMPTY_CADASTRO = { nome: '', dataNascimento: '', sexo: '', parentesco: '', aceito: false };

const PatientDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const [showWalletTopup, setShowWalletTopup] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [sistemaAberto, setSistemaAberto] = useState(null);
  const [sistemaMotivo, setSistemaMotivo] = useState(null);
  const [sistemaProximaAbertura, setSistemaProximaAbertura] = useState(null);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const [passarAgoraLoading, setPassarAgoraLoading] = useState(false);

  // ── Lembrete de próxima consulta ─────────────────────────────────────────
  const [proximaConsulta,   setProximaConsulta]   = useState(null);
  const [proximaDismissId,  setProximaDismissId]   = useState(() => {
    try { return sessionStorage.getItem('proximaConsultaDismissId') || null; } catch { return null; }
  });
  const [reminderDetalhes, setReminderDetalhes] = useState(null);

  // ── Avaliação pendente ───────────────────────────────────────────────────
  const [avaliacaoPendente,  setAvaliacaoPendente]  = useState(null);
  const [avaliacaoDismiss,   setAvaliacaoDismiss]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('avaliacaoDismiss') || '{}'); } catch { return {}; }
  });
  const [avaliacaoNota,      setAvaliacaoNota]       = useState(0);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('');
  const [avaliacaoEnviando,  setAvaliacaoEnviando]   = useState(false);
  const [avaliacaoEnviada,   setAvaliacaoEnviada]    = useState(false);

  // ── Extrato ──────────────────────────────────────────────────────────────
  const [showExtrato,   setShowExtrato]   = useState(false);
  const [showDocumentos, setShowDocumentos] = useState(false);
  const [extrato,       setExtrato]       = useState(null);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [passarAgoraMsg, setPassarAgoraMsg] = useState(null);
  const urgentIdRef = useRef(null);
  const [addingCredito, setAddingCredito] = useState(false);
  const [creditoToast, setCreditoToast]   = useState(null);
  const [showTriagemUrgente, setShowTriagemUrgente] = useState(false);
  const [showConsentUrgente, setShowConsentUrgente] = useState(false);
  const [consentUrgenteOk, setConsentUrgenteOk]     = useState(null);

  // ── Retorno sugerido ────────────────────────────────────────────────────────
  const [retornoSugerido, setRetornoSugerido] = useState(null);
  const [dispensandoRetorno, setDispensandoRetorno] = useState(false);
  const [agendandoRetorno, setAgendandoRetorno] = useState(false);
  const [retornoAgendando, setRetornoAgendando] = useState(null); // { consultaId, tipo } — dispensa ao concluir o agendamento
  const [retornoInitialDate, setRetornoInitialDate] = useState(null);

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
  const hasProfile          = Boolean(user?.pacienteProfile);
  const onboardingPendente  = hasProfile && user.pacienteProfile.onboardingConcluido === false;

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

  const fetchProximaConsulta = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/paciente/proxima-consulta`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProximaConsulta(data);
      // Re-exibir lembrete dispensado se faltar menos de 2h
      if (data && proximaDismissId === data.id) {
        const diffMs = new Date(data.dataHora).getTime() - Date.now();
        if (diffMs > 0 && diffMs < 2 * 60 * 60 * 1000) {
          setProximaDismissId(null);
          try { sessionStorage.removeItem('proximaConsultaDismissId'); } catch {}
        }
      }
    } catch {}
  }, [token, proximaDismissId]);

  const fetchAvaliacaoPendente = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/paciente/avaliacao-pendente`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAvaliacaoPendente(data);
    } catch {}
  }, [token]);

  const fetchRetornoSugerido = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/paciente/retorno-sugerido`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRetornoSugerido(await res.json());
    } catch {}
  }, [token]);

  const fetchExtrato = async () => {
    setExtratoLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/paciente/extrato`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setExtrato(await res.json());
    } catch {}
    finally { setExtratoLoading(false); }
  };

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

  useEffect(() => { fetchWalletBalance(); },           [fetchWalletBalance]);
  useEffect(() => { fetchSistemaAberto(); },           [fetchSistemaAberto]);
  useEffect(() => { fetchProximaConsulta(); },         [fetchProximaConsulta]);
  useEffect(() => { fetchAvaliacaoPendente(); },       [fetchAvaliacaoPendente]);
  useEffect(() => { fetchRetornoSugerido(); },         [fetchRetornoSugerido]);

  useEffect(() => {
    const id = setInterval(fetchProximaConsulta, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchProximaConsulta]);

  useEffect(() => {
    const id = setInterval(fetchSistemaAberto, 60000);
    return () => clearInterval(id);
  }, [fetchSistemaAberto]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        fetchSistemaAberto();
        fetchProximaConsulta();
        setAppointmentsRefreshKey((k) => k + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSistemaAberto, fetchProximaConsulta]);

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
            setPassarAgoraMsg({
              type: 'success',
              farmaceutico: data.urgente.farmaceutico,
              whatsappContato: data.urgente.whatsappContato,
              modalidadeAtend: data.urgente.modalidadeAtend,
            });
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

  if (onboardingPendente) {
    return <OnboardingSlider onConcluido={refreshUser} />;
  }

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

  const handleDispensarRetorno = async () => {
    if (!retornoSugerido) return;
    setDispensandoRetorno(true);
    try {
      const res = await fetch(`${API_URL}/api/consulta/${retornoSugerido.consultaId}/dispensar-retorno`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: retornoSugerido.tipo }),
      });
      if (res.ok) setRetornoSugerido(null);
    } catch {}
    finally { setDispensandoRetorno(false); }
  };

  // "Agendar retorno": pré-preenche a data (hoje + dias_sugeridos, ajustada para o
  // próximo dia com sistema aberto e horários disponíveis) e abre o fluxo normal de
  // agendamento. Ao concluir, dispensa o retorno sugerido automaticamente.
  const handleAgendarRetorno = async () => {
    if (!retornoSugerido) return;
    const retorno = retornoSugerido;
    setAgendandoRetorno(true);
    try {
      const diasSugeridos = retorno.retornoSugerido?.dias_sugeridos ?? 1;
      let candidate = new Date(Date.now() + diasSugeridos * 86400000);
      let foundDate = null;
      for (let i = 0; i < 30; i++) {
        const dataStr = toLocalDateStr(candidate);
        try {
          const res = await fetch(`${API_URL}/api/disponibilidade?data=${dataStr}`);
          if (res.ok) {
            const d = await res.json();
            if (Array.isArray(d.slots) && d.slots.length > 0) { foundDate = dataStr; break; }
          }
        } catch {}
        candidate = new Date(candidate.getTime() + 86400000);
      }
      setRetornoAgendando({ consultaId: retorno.consultaId, tipo: retorno.tipo });
      setRetornoInitialDate(foundDate || toLocalDateStr(new Date(Date.now() + diasSugeridos * 86400000)));
      setRetornoSugerido(null);
      setShowDataModal(true);
    } finally {
      setAgendandoRetorno(false);
    }
  };

  const closeDataModal = () => {
    setShowDataModal(false);
    setRetornoAgendando(null);
    setRetornoInitialDate(null);
    fetchWalletBalance();
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

  // Pede permissão de notificação só após uma ação relevante (nunca no load) e,
  // se concedida, registra a subscription de push.
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    getCurrentPushSubscription().then((sub) => setPushEnabled(Boolean(sub))).catch(() => {});
  }, []);

  const maybeRequestPush = useCallback(async () => {
    try {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        const sub = await subscribeToPush(token);
        if (sub) setPushEnabled(true);
      }
    } catch { /* silencioso — push é conveniência, não bloqueia o fluxo */ }
  }, [token]);

  const togglePush = async () => {
    setTogglingPush(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(token);
        setPushEnabled(false);
      } else {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        const sub = await subscribeToPush(token);
        setPushEnabled(Boolean(sub));
      }
    } catch { /* silencioso */ }
    setTogglingPush(false);
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
        maybeRequestPush();
      }
    } catch {
      setPassarAgoraMsg({ type: 'error', mensagem: 'Falha de conexão. Tente novamente.' });
    } finally {
      setPassarAgoraLoading(false);
    }
  };

  // Posição na fila / farmacêuticos online — atualiza em paralelo ao poll de status,
  // num ritmo mais espaçado (não precisa da mesma frequência que a detecção de aceite).
  const [filaInfo, setFilaInfo] = useState(null);
  useEffect(() => {
    if (passarAgoraMsg?.type !== 'waiting') { setFilaInfo(null); return; }

    const pollFilaInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/fila/urgente/ativa`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.urgente?.status === 'aguardando') {
          setFilaInfo({
            posicao:              data.urgente.posicao,
            totalAguardando:      data.urgente.total_aguardando,
            tempoMedioAceiteMin:  data.urgente.tempo_medio_aceite_min,
            farmaceuticosOnline:  data.urgente.farmaceuticos_online,
          });
        }
      } catch {}
    };

    pollFilaInfo();
    const interval = setInterval(pollFilaInfo, 15000);
    return () => clearInterval(interval);
  }, [passarAgoraMsg?.type, token]);

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
          setPassarAgoraMsg({
            type: 'success',
            farmaceutico: data.farmaceutico,
            whatsappContato: data.whatsappContato,
            modalidadeAtend: data.modalidadeAtend,
          });
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

      {/* Toggle: Notificações push (só depois que a permissão já foi decidida) */}
      {isPushSupported() && typeof Notification !== 'undefined' && Notification.permission !== 'default' && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`text-xl ${pushEnabled ? 'text-violet-500' : 'text-gray-400'}`}>
              {pushEnabled ? '🔔' : '🔕'}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Notificações push</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pushEnabled
                  ? 'Você recebe avisos de aceite, lembrete e orientações prontas'
                  : 'Ative para receber avisos mesmo com o app fechado'}
              </p>
            </div>
          </div>
          <button
            onClick={togglePush}
            disabled={togglingPush}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              pushEnabled ? 'bg-violet-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={pushEnabled}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              pushEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
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

      {/* Card de lembrete de próxima consulta */}
      {proximaConsulta && proximaDismissId !== proximaConsulta.id && (
        <div style={{
          background: '#eff6ff', border: '1.5px solid #93c5fd',
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.2 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e40af' }}>
              Você tem consulta {fmtWhen(proximaConsulta.dataHora)}
              {proximaConsulta.pessoaNome ? ` para ${proximaConsulta.pessoaNome.split(' ')[0]}` : ''}
            </p>
            <button
              onClick={() => setReminderDetalhes({ id: proximaConsulta.id, tipo: proximaConsulta.tipo })}
              style={{
                marginTop: 4, background: 'none', border: 'none',
                padding: 0, fontSize: 12, color: '#2563eb',
                cursor: 'pointer', fontWeight: 600, textDecoration: 'underline',
              }}
            >
              Ver detalhes →
            </button>
          </div>
          <button
            onClick={() => {
              const id = proximaConsulta.id;
              setProximaDismissId(id);
              try { sessionStorage.setItem('proximaConsultaDismissId', id); } catch {}
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#93c5fd', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0,
            }}
            aria-label="Dispensar lembrete"
          >
            ×
          </button>
        </div>
      )}

      {/* Card de avaliação pendente */}
      {(() => {
        if (!avaliacaoPendente) return null;
        const dismissCount = avaliacaoDismiss[avaliacaoPendente.id] ?? 0;
        if (dismissCount >= 2) return null;
        const fmtData = new Date(avaliacaoPendente.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        const handleDismiss = () => {
          const next = { ...avaliacaoDismiss, [avaliacaoPendente.id]: dismissCount + 1 };
          setAvaliacaoDismiss(next);
          try { localStorage.setItem('avaliacaoDismiss', JSON.stringify(next)); } catch {}
        };

        const handleEnviar = async () => {
          if (!avaliacaoNota) return;
          setAvaliacaoEnviando(true);
          try {
            const res = await fetch(`${API_URL}/api/avaliacoes`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                consulta_id: avaliacaoPendente.id,
                tipo:        avaliacaoPendente.tipo,
                nota:        avaliacaoNota,
                comentario:  avaliacaoComentario.trim() || undefined,
              }),
            });
            if (res.ok) {
              setAvaliacaoEnviada(true);
              setTimeout(() => {
                setAvaliacaoPendente(null);
                setAvaliacaoEnviada(false);
                setAvaliacaoNota(0);
                setAvaliacaoComentario('');
              }, 2000);
            }
          } catch {}
          finally { setAvaliacaoEnviando(false); }
        };

        return (
          <div style={{
            background: '#fdf4ff', border: '1.5px solid #e9d5ff',
            borderRadius: 12, padding: '14px 16px',
          }}>
            {avaliacaoEnviada ? (
              <p style={{ fontSize: 14, color: '#7c3aed', fontWeight: 700, margin: 0, textAlign: 'center' }}>
                ✓ Avaliação enviada! Obrigado.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#6b21a8' }}>Como foi sua consulta?</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9333ea' }}>
                      {avaliacaoPendente.farmaceutico ? `Com ${avaliacaoPendente.farmaceutico.split(' ')[0]}` : 'Consulta'} · {fmtData}
                    </p>
                  </div>
                  <button
                    onClick={handleDismiss}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}
                    aria-label="Agora não"
                  >
                    ×
                  </button>
                </div>

                {/* Estrelas */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAvaliacaoNota(n)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: 28, lineHeight: 1,
                        color: n <= avaliacaoNota ? '#f59e0b' : '#e5e7eb',
                        transition: 'color 0.1s',
                      }}
                      aria-label={`${n} estrelas`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                {avaliacaoNota > 0 && (
                  <>
                    <textarea
                      value={avaliacaoComentario}
                      onChange={(e) => setAvaliacaoComentario(e.target.value)}
                      placeholder="Comentário opcional..."
                      maxLength={500}
                      rows={2}
                      style={{
                        width: '100%', boxSizing: 'border-box', resize: 'none',
                        border: '1px solid #e9d5ff', borderRadius: 8,
                        padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
                        outline: 'none', marginBottom: 10, color: '#374151',
                        background: 'white',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleDismiss}
                        style={{
                          flex: 1, padding: '9px 0', background: 'white',
                          border: '1px solid #e9d5ff', borderRadius: 8,
                          fontSize: 13, color: '#9333ea', cursor: 'pointer',
                        }}
                      >
                        Agora não
                      </button>
                      <button
                        onClick={handleEnviar}
                        disabled={avaliacaoEnviando}
                        style={{
                          flex: 2, padding: '9px 0', background: '#7c3aed', color: 'white',
                          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                          cursor: avaliacaoEnviando ? 'not-allowed' : 'pointer',
                          opacity: avaliacaoEnviando ? 0.6 : 1,
                        }}
                      >
                        {avaliacaoEnviando ? 'Enviando...' : 'Enviar avaliação'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Card de retorno sugerido */}
      {retornoSugerido && (() => {
        const rs = retornoSugerido.retornoSugerido;
        const diasSugeridos = rs?.dias_sugeridos;
        const observacao = rs?.observacao;
        const dataEstimada = diasSugeridos
          ? new Date(Date.now() + diasSugeridos * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
          : null;

        return (
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #86efac',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                  🔄 Retorno sugerido{dataEstimada ? ` para ~${dataEstimada}` : ''}
                </p>
                {retornoSugerido.farmaceuticoNome && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#16a34a' }}>
                    Por {retornoSugerido.farmaceuticoNome.split(' ')[0]}
                    {diasSugeridos ? ` · em ${diasSugeridos} dias` : ''}
                  </p>
                )}
              </div>
              <button
                onClick={handleDispensarRetorno}
                disabled={dispensandoRetorno}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86efac', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}
                aria-label="Dispensar sugestão"
              >
                ×
              </button>
            </div>
            {observacao && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#166534', fontStyle: 'italic' }}>
                "{observacao}"
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAgendarRetorno}
                disabled={agendandoRetorno}
                style={{
                  flex: 2, padding: '8px 0', background: '#16a34a', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: agendandoRetorno ? 'wait' : 'pointer', opacity: agendandoRetorno ? 0.7 : 1,
                }}
              >
                {agendandoRetorno ? 'Verificando horários...' : 'Agendar retorno'}
              </button>
              <button
                onClick={handleDispensarRetorno}
                disabled={dispensandoRetorno}
                style={{
                  flex: 1, padding: '8px 0', background: 'white', color: '#16a34a',
                  border: '1px solid #86efac', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  opacity: dispensandoRetorno ? 0.6 : 1,
                }}
              >
                {dispensandoRetorno ? '...' : 'Dispensar'}
              </button>
            </div>
          </div>
        );
      })()}

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
                    onClick={async () => {
                      // Verifica disponibilidade antes de mostrar triagem
                      try {
                        const dr = await fetch(`${API_URL}/api/fila/urgente/disponibilidade`);
                        const dd = dr.ok ? await dr.json() : null;
                        if (dd && !dd.disponivel) {
                          setPassarAgoraMsg({ type: 'nenhum_disponivel' });
                          return;
                        }
                      } catch {}
                      // Verifica consent antes de abrir triagem urgente
                      if (consentUrgenteOk === true) { setShowTriagemUrgente(true); return; }
                      try {
                        const r = await fetch(`${API_URL}/api/consent/telefarmacia`, { headers: { Authorization: `Bearer ${token}` } });
                        const d = r.ok ? await r.json() : null;
                        if (d?.aceito) { setConsentUrgenteOk(true); setShowTriagemUrgente(true); }
                        else           { setConsentUrgenteOk(false); setShowConsentUrgente(true); }
                      } catch { setShowTriagemUrgente(true); }
                    }}
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
              background: passarAgoraMsg.type === 'success'          ? '#f0fdf4'
                        : passarAgoraMsg.type === 'waiting'           ? '#eff6ff'
                        : passarAgoraMsg.type === 'nenhum_disponivel' ? '#fff7ed'
                        : '#fef2f2',
              border: `1px solid ${
                passarAgoraMsg.type === 'success'          ? '#86efac'
                : passarAgoraMsg.type === 'waiting'        ? '#bfdbfe'
                : passarAgoraMsg.type === 'nenhum_disponivel' ? '#fed7aa'
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
                {passarAgoraMsg.type === 'waiting' && filaInfo && (
                  <p style={{ fontSize: '12px', color: '#1d4ed8', margin: '6px 0 0' }}>
                    {filaInfo.farmaceuticosOnline > 0 ? (
                      <>
                        Você é o <strong>{filaInfo.posicao}º</strong> da fila
                        {filaInfo.tempoMedioAceiteMin != null && (
                          <> · tempo médio de aceite ~<strong>{filaInfo.tempoMedioAceiteMin} min</strong></>
                        )}
                        {' '}· <strong>{filaInfo.farmaceuticosOnline}</strong> farmacêutico{filaInfo.farmaceuticosOnline !== 1 ? 's' : ''} online
                      </>
                    ) : (
                      'Nenhum farmacêutico online agora — você será notificado assim que alguém aceitar.'
                    )}
                  </p>
                )}
                {passarAgoraMsg.type === 'success' && (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', margin: '0 0 4px 0' }}>
                      ✓ Farmacêutico aceitou!
                    </p>
                    <p style={{ fontSize: '13px', color: '#166534', margin: '0 0 8px 0' }}>
                      {passarAgoraMsg.farmaceutico} está pronto para seu atendimento.
                    </p>
                    {passarAgoraMsg.modalidadeAtend === 'meet' ? (
                      <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
                        📹 Atendimento via <strong>Google Meet</strong> — aguarde o link no chat ou e-mail.
                      </p>
                    ) : passarAgoraMsg.whatsappContato ? (
                      <a
                        href={`https://wa.me/55${passarAgoraMsg.whatsappContato.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: '13px', fontWeight: 700, color: '#fff',
                          background: '#16a34a', borderRadius: 8,
                          padding: '6px 14px', textDecoration: 'none',
                        }}
                      >
                        📱 Abrir WhatsApp
                      </a>
                    ) : null}
                  </>
                )}
                {passarAgoraMsg.type === 'nenhum_disponivel' && (
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#b91c1c', margin: '0 0 6px 0' }}>
                      Nenhum profissional disponível no momento
                    </p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0' }}>
                      Todos os farmacêuticos estão ocupados ou offline. Tente mais tarde ou agende um horário.
                    </p>
                    <button
                      onClick={() => { setPassarAgoraMsg(null); setShowDataModal(true); }}
                      style={{
                        fontSize: '13px', fontWeight: 700, color: '#fff',
                        background: '#2563eb', border: 'none', borderRadius: '6px',
                        padding: '6px 14px', cursor: 'pointer',
                      }}
                    >
                      📅 Agendar horário
                    </button>
                  </div>
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
            <button
              onClick={() => { setShowExtrato(true); fetchExtrato(); }}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#7c3aed', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', marginTop: 2 }}
            >
              Ver extrato
            </button>
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

      {/* Consentimento — gate para urgência */}
      {showConsentUrgente && (
        <TermoConsentimento
          onAceito={() => { setConsentUrgenteOk(true); setShowConsentUrgente(false); setShowTriagemUrgente(true); }}
          onFechar={() => setShowConsentUrgente(false)}
        />
      )}

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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDataModal} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
          >
            <TriagemForm
              tipo="agendado"
              initialDate={retornoInitialDate}
              onBack={closeDataModal}
              onBooked={() => {
                setBookedSuccess(true);
                setTimeout(() => setBookedSuccess(false), 4000);
                setAppointmentsRefreshKey((k) => k + 1);
                maybeRequestPush();
                if (retornoAgendando) {
                  fetch(`${API_URL}/api/consulta/${retornoAgendando.consultaId}/dispensar-retorno`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipo: retornoAgendando.tipo }),
                  }).catch(() => {});
                  setRetornoAgendando(null);
                }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="font-semibold text-gray-800 text-sm" style={{ margin: 0 }}>Minhas consultas</h3>
          <button
            onClick={() => setShowDocumentos(true)}
            style={{
              background: 'none', border: '1.5px solid #e5e7eb', borderRadius: 8,
              padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#7c3aed',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            📄 Meus documentos
          </button>
        </div>
        <MyAppointments onCancelled={fetchWalletBalance} selectedPerson={selectedPerson} refreshKey={appointmentsRefreshKey} />
      </div>

      {/* Sheet de extrato da carteira */}
      {showExtrato && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExtrato(false)} />
          <div
            className="relative bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-md"
            style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px 16px 0 0' }}
          >
            <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Extrato da carteira</h2>
              <button
                onClick={() => setShowExtrato(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 28px' }}>
              {extratoLoading && (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 32 }}>Carregando...</p>
              )}
              {!extratoLoading && extrato && (
                <>
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, textAlign: 'right' }}>
                    Saldo atual: <strong style={{ color: '#111827' }}>R$ {extrato.saldo.toFixed(2).replace('.', ',')}</strong>
                  </p>
                  {extrato.transacoes.length === 0 ? (
                    <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 32 }}>
                      Nenhuma movimentação registrada.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {extrato.transacoes.map((t) => {
                        const isCredito = t.tipo === 'credito';
                        const isEstorno = t.tipo === 'estorno';
                        const cor = isCredito || isEstorno ? '#16a34a' : '#dc2626';
                        const sinal = isCredito || isEstorno ? '+' : '−';
                        const dt = new Date(t.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={t.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '11px 0', borderBottom: '1px solid #f3f4f6', gap: 12,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t.descricao}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{dt}</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: cor }}>
                                {sinal} R$ {t.valor.toFixed(2).replace('.', ',')}
                              </p>
                              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af' }}>
                                saldo: R$ {t.saldoApos.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sheet: meus documentos */}
      {showDocumentos && <MeusDocumentos onClose={() => setShowDocumentos(false)} />}

      {/* Modal de detalhes aberto pelo card de lembrete */}
      {reminderDetalhes && (
        <ConsultaDetalhesPaciente
          id={reminderDetalhes.id}
          tipo={reminderDetalhes.tipo}
          onClose={() => setReminderDetalhes(null)}
          onCancelled={() => {
            setReminderDetalhes(null);
            setProximaConsulta(null);
            fetchWalletBalance();
            setAppointmentsRefreshKey((k) => k + 1);
          }}
          onAgendar={() => {
            setReminderDetalhes(null);
            setShowDataModal(true);
          }}
        />
      )}
    </div>
  );
};

export default PatientDashboard;
