import React, { useState, useEffect } from 'react';
import { FileText, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import CheckoutPix from './CheckoutPix';
import PatientProfileForm from './PatientProfileForm';
import OnboardingSlider from './OnboardingSlider';
import MeusDocumentos from './MeusDocumentos';
import { useWallet } from '../hooks/useWallet';
import { useSistemaAberto } from '../hooks/useSistemaAberto';
import { useDependentes } from '../hooks/useDependentes';
import { usePushToggle } from '../hooks/usePushToggle';
import PushToggleBanner from './patient/PushToggleBanner';
import DadosSaudeBanner from './patient/DadosSaudeBanner';
import PerfilSelector from './patient/PerfilSelector';
import ProximaConsultaCard from './patient/ProximaConsultaCard';
import AvaliacaoPendenteCard from './patient/AvaliacaoPendenteCard';
import RetornoSugeridoCard from './patient/RetornoSugeridoCard';
import AgendamentoButtons from './patient/AgendamentoButtons';
import CarteiraCard from './patient/CarteiraCard';
import AgendarConsultaModal from './patient/AgendarConsultaModal';
import LembretesMedicacao from './patient/LembretesMedicacao';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PatientDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const [showWalletTopup, setShowWalletTopup] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const [showDocumentos, setShowDocumentos] = useState(false);
  const [retornoAgendando, setRetornoAgendando] = useState(null); // { consultaId, tipo } — dispensa ao concluir o agendamento
  const [retornoInitialDate, setRetornoInitialDate] = useState(null);

  const { walletBalance, setWalletBalance, fetchWalletBalance } = useWallet(token);
  const { sistemaAberto, sistemaMotivo, sistemaProximaAbertura } = useSistemaAberto();
  const dep = useDependentes(token);
  const { pushEnabled, togglingPush, maybeRequestPush, togglePush } = usePushToggle(token);

  // "Para você": some quando nenhum dos três cards tem conteúdo
  const [avaliacaoVisible, setAvaliacaoVisible] = useState(false);
  const [retornoVisible, setRetornoVisible] = useState(false);
  const [dadosSaudeVisible, setDadosSaudeVisible] = useState(false);
  const paraVoceVisible = avaliacaoVisible || retornoVisible || dadosSaudeVisible;

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setAppointmentsRefreshKey((k) => k + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── Perfil ─────────────────────────────────────────────────────────────────
  const hasProfile          = Boolean(user?.pacienteProfile);
  const onboardingPendente  = hasProfile && user.pacienteProfile.onboardingConcluido === false;

  if (onboardingPendente) {
    return <OnboardingSlider onConcluido={refreshUser} />;
  }

  if (!hasProfile) {
    return (
      <div className="space-y-4">
        <div className="bg-alert-wash border border-alert/30 rounded-xl p-5 text-center">
          <p className="text-base font-bold text-alert mb-1">Complete seu cadastro</p>
          <p className="text-sm text-alert">
            Preencha seus dados pessoais para acessar o sistema de agendamentos e cumprir os requisitos da LGPD.
          </p>
        </div>
        <div className="max-w-lg mx-auto bg-canvas border border-line rounded-2xl p-6 shadow-sm">
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
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition"
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

  const closeDataModal = () => {
    setShowDataModal(false);
    setRetornoAgendando(null);
    setRetornoInitialDate(null);
    fetchWalletBalance();
  };

  const primeiroNome = (user?.name || '').split(' ')[0];
  const cuidandoDe = dep.selectedPerson ? dep.selectedPerson.nome.split(' ')[0] : null;

  return (
    <div className="space-y-6">
      {/* Sucesso de agendamento */}
      {bookedSuccess && (
        <div className="bg-success-wash border border-success/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Check className="w-5 h-5 text-success shrink-0" strokeWidth={3} />
          <p className="text-sm font-semibold text-success">Consulta agendada com sucesso!</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink">
            {cuidandoDe ? `Cuidando de: ${cuidandoDe}` : `Olá, ${primeiroNome}`}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {cuidandoDe ? 'Consultas e pendências deste perfil' : 'Bem-vindo(a) de volta'}
          </p>
        </div>
        <CarteiraCard walletBalance={walletBalance} setWalletBalance={setWalletBalance} onOpenTopup={() => setShowWalletTopup(true)} />
      </div>

      <PerfilSelector {...dep} />

      <ProximaConsultaCard
        token={token}
        onCancelledExtra={() => { fetchWalletBalance(); setAppointmentsRefreshKey((k) => k + 1); }}
        onAgendar={() => setShowDataModal(true)}
      />

      {/* Para você */}
      <div className={paraVoceVisible ? '' : 'hidden'}>
        <p className="text-[11px] font-bold tracking-wider uppercase text-muted mb-2">Para você</p>
        <div className="flex items-stretch gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          <AvaliacaoPendenteCard onVisibleChange={setAvaliacaoVisible} />
          <RetornoSugeridoCard
            token={token}
            onAgendar={({ consultaId, tipo, initialDate }) => {
              setRetornoAgendando({ consultaId, tipo });
              setRetornoInitialDate(initialDate);
              setShowDataModal(true);
            }}
            onVisibleChange={setRetornoVisible}
          />
          <DadosSaudeBanner selectedPerson={dep.selectedPerson} nomeTitular={user?.name} onVisibleChange={setDadosSaudeVisible} />
        </div>
      </div>

      <AgendamentoButtons
        walletBalance={walletBalance}
        sistemaAberto={sistemaAberto}
        sistemaMotivo={sistemaMotivo}
        sistemaProximaAbertura={sistemaProximaAbertura}
        selectedPerson={dep.selectedPerson}
        dependentes={dep.dependentes}
        setAppointmentsRefreshKey={setAppointmentsRefreshKey}
        fetchWalletBalance={fetchWalletBalance}
        maybeRequestPush={maybeRequestPush}
        onOpenDataModal={() => setShowDataModal(true)}
        onOpenWalletTopup={() => setShowWalletTopup(true)}
      />

      {showDataModal && (
        <AgendarConsultaModal
          initialDate={retornoInitialDate}
          onClose={closeDataModal}
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
          preSelectedPerson={dep.selectedPerson}
          dependentes={dep.dependentes}
        />
      )}

      {/* My appointments */}
      <div className="bg-canvas border border-line rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold tracking-wider uppercase text-muted m-0">Minhas consultas</h3>
          <button
            onClick={() => setShowDocumentos(true)}
            className="inline-flex items-center gap-1.5 bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-deep whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" /> Meus documentos
          </button>
        </div>
        <MyAppointments onCancelled={fetchWalletBalance} selectedPerson={dep.selectedPerson} refreshKey={appointmentsRefreshKey} />
      </div>

      {showDocumentos && <MeusDocumentos onClose={() => setShowDocumentos(false)} />}

      <LembretesMedicacao
        dependentes={dep.dependentes}
        pushEnabled={pushEnabled}
        togglingPush={togglingPush}
        togglePush={togglePush}
      />


      <PushToggleBanner pushEnabled={pushEnabled} togglingPush={togglingPush} togglePush={togglePush} />
    </div>
  );
};

export default PatientDashboard;
