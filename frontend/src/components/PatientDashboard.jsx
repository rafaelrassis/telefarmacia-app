import React, { useState, useEffect } from 'react';
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
import PerfilSelector from './patient/PerfilSelector';
import ProximaConsultaCard from './patient/ProximaConsultaCard';
import AvaliacaoPendenteCard from './patient/AvaliacaoPendenteCard';
import RetornoSugeridoCard from './patient/RetornoSugeridoCard';
import SistemaFechadoBanner from './patient/SistemaFechadoBanner';
import AgendamentoButtons from './patient/AgendamentoButtons';
import CarteiraCard from './patient/CarteiraCard';
import AgendarConsultaModal from './patient/AgendarConsultaModal';

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

  const closeDataModal = () => {
    setShowDataModal(false);
    setRetornoAgendando(null);
    setRetornoInitialDate(null);
    fetchWalletBalance();
  };

  return (
    <div className="space-y-6">
      {/* Sucesso de agendamento */}
      {bookedSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-green-600 font-bold text-lg">✓</span>
          <p className="text-sm font-semibold text-green-800">Consulta agendada com sucesso!</p>
        </div>
      )}

      <PushToggleBanner pushEnabled={pushEnabled} togglingPush={togglingPush} togglePush={togglePush} />

      <PerfilSelector {...dep} />

      <ProximaConsultaCard
        token={token}
        onCancelledExtra={() => { fetchWalletBalance(); setAppointmentsRefreshKey((k) => k + 1); }}
        onAgendar={() => setShowDataModal(true)}
      />

      <AvaliacaoPendenteCard />

      <RetornoSugeridoCard
        token={token}
        onAgendar={({ consultaId, tipo, initialDate }) => {
          setRetornoAgendando({ consultaId, tipo });
          setRetornoInitialDate(initialDate);
          setShowDataModal(true);
        }}
      />

      <SistemaFechadoBanner
        sistemaAberto={sistemaAberto} sistemaMotivo={sistemaMotivo} sistemaProximaAbertura={sistemaProximaAbertura}
      />

      <AgendamentoButtons
        walletBalance={walletBalance}
        sistemaAberto={sistemaAberto}
        selectedPerson={dep.selectedPerson}
        dependentes={dep.dependentes}
        setAppointmentsRefreshKey={setAppointmentsRefreshKey}
        fetchWalletBalance={fetchWalletBalance}
        maybeRequestPush={maybeRequestPush}
        onOpenDataModal={() => setShowDataModal(true)}
        onOpenWalletTopup={() => setShowWalletTopup(true)}
      />

      <CarteiraCard walletBalance={walletBalance} setWalletBalance={setWalletBalance} />

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
        <MyAppointments onCancelled={fetchWalletBalance} selectedPerson={dep.selectedPerson} refreshKey={appointmentsRefreshKey} />
      </div>

      {showDocumentos && <MeusDocumentos onClose={() => setShowDocumentos(false)} />}
    </div>
  );
};

export default PatientDashboard;
