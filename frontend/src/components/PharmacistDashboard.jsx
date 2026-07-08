import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import PharmacistProfileEditor from './PharmacistProfileEditor';
import DocUploadForm from './DocUploadForm';
import ConsultaModal from './ConsultaModal';
import GanhosTab from './GanhosTab';
import AvaliacoesTab from './AvaliacoesTab';
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '../utils/push';
import { useIsLg } from '../hooks/useIsLg';
import FilaPanel from './pharmacist/FilaPanel';
import UrgentesPanel from './pharmacist/UrgentesPanel';
import UrgentesAceitasPanel from './pharmacist/UrgentesAceitasPanel';
import CalendarioTab from './pharmacist/CalendarioTab';
import AgendaTab from './pharmacist/AgendaTab';
import TemplatesTab from './pharmacist/TemplatesTab';
import ResumoDoDia from './pharmacist/ResumoDoDia';
import { getPharmacistStatus } from '../utils/pharmacistFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TABS = [
  { id: 'calendario', label: 'Calendário'   },
  { id: 'agenda',     label: 'Minha agenda' },
  { id: 'templates',  label: 'Templates'    },
  { id: 'consultas',  label: 'Consultas'    },
  { id: 'ganhos',     label: '💰 Ganhos'   },
  { id: 'avaliacoes', label: '⭐ Avaliações' },
];

const PharmacistDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const isLg = useIsLg();
  const [activeTab, setActiveTab]         = useState('calendario');
  const [showDocForm, setShowDocForm]     = useState(false);
  const [calendarTrigger, setCalendarTrigger] = useState(0);
  const [consultaAlvo, setConsultaAlvo]       = useState(null);
  const [hasEmAtendimento, setHasEmAtendimento] = useState(false);
  const [togglingDisponivel, setTogglingDisponivel] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  const status              = getPharmacistStatus(user?.pharmacistProfile);
  const isApproved          = status.key === 'ativo';
  const isSuspenso          = status.key === 'suspenso';
  const docEnviado          = status.docEnviado;
  const disponivelUrgencias = user?.pharmacistProfile?.disponivelUrgencias ?? true;

  // Solicita permissão de notificação do navegador ao aprovar o farmacêutico
  useEffect(() => {
    if (!isApproved) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isApproved]);

  // Enquanto a conta está pendente, verifica a aprovação sozinho em segundo
  // plano — sem exigir que o farmacêutico clique em nada.
  useEffect(() => {
    if (isApproved) return;
    const id = setInterval(refreshUser, 20000);
    return () => clearInterval(id);
  }, [isApproved, refreshUser]);

  // Sincroniza estado do toggle de push com a subscription real do navegador
  useEffect(() => {
    if (!isApproved || !isPushSupported()) return;
    getCurrentPushSubscription().then((sub) => setPushEnabled(Boolean(sub))).catch(() => {});
  }, [isApproved]);

  // Se já está disponível para urgências e a permissão foi concedida, garante a subscription
  useEffect(() => {
    if (!isApproved || !disponivelUrgencias) return;
    if (Notification.permission !== 'granted') return;
    subscribeToPush(token).then((sub) => { if (sub) setPushEnabled(true); }).catch(() => {});
  }, [isApproved, disponivelUrgencias, token]);

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
    } catch {}
    setTogglingPush(false);
  };

  const toggleDisponivelUrgencias = async () => {
    setTogglingDisponivel(true);
    try {
      const novoValor = !disponivelUrgencias;
      await fetch(`${API_URL}/api/farmaceuticos/me/disponibilidade`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ disponivelUrgencias: novoValor }),
      });
      await refreshUser();
      if (!novoValor) {
        await unsubscribeFromPush(token).catch(() => {});
        setPushEnabled(false);
      } else if (Notification.permission === 'granted') {
        const sub = await subscribeToPush(token).catch(() => null);
        if (sub) setPushEnabled(true);
      }
    } catch {}
    setTogglingDisponivel(false);
  };

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

  return (
    <div className="w-full">

      {/* Banner de conta suspensa */}
      {isSuspenso && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <span className="text-red-500 mt-0.5">⛔</span>
          <div>
            <p className="font-semibold text-red-800 text-sm">Conta suspensa</p>
            <p className="text-xs text-red-700 mt-0.5">
              Sua conta foi suspensa por um administrador e não recebe novas consultas no momento.
              Entre em contato com o suporte se acredita que isso é um engano.
            </p>
          </div>
        </div>
      )}

      {/* Banner de aprovação pendente */}
      {!isApproved && !isSuspenso && (
        <div className="mb-5 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
            <span className="text-amber-500 mt-0.5">⏳</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Conta aguardando aprovação</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {docEnviado
                  ? 'Documentos enviados. Um administrador irá analisar seu CRF e seus documentos — assim que aprovado, sua conta é liberada automaticamente e você recebe um aviso aqui.'
                  : 'Envie seus documentos para que um administrador possa analisar e ativar seu cadastro.'}
              </p>
            </div>
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
                    className="shrink-0 bg-brand hover:bg-brand-deep text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Toggle: Disponível para urgências ── */}
      {isApproved && <ResumoDoDia token={token} refreshTrigger={calendarTrigger} />}

      {isApproved && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-xl ${disponivelUrgencias ? 'text-green-500' : 'text-gray-400'}`}>
              {disponivelUrgencias ? '🟢' : '⭕'}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Disponível para urgências</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {disponivelUrgencias
                  ? 'Você aparece na fila de urgências e pode ser acionado'
                  : 'Você não recebe novas urgências. Consultas agendadas não são afetadas.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDisponivelUrgencias}
            disabled={togglingDisponivel}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              disponivelUrgencias ? 'bg-green-500' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={disponivelUrgencias}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              disponivelUrgencias ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      )}

      {/* ── Toggle: Notificações push ── */}
      {isApproved && isPushSupported() && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-xl ${pushEnabled ? 'text-brand' : 'text-gray-400'}`}>
              {pushEnabled ? '🔔' : '🔕'}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Notificações push</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pushEnabled
                  ? 'Você recebe um alerta no celular/navegador quando surge uma urgência'
                  : 'Ative para ser avisado de novas urgências mesmo com o app fechado'}
              </p>
            </div>
          </div>
          <button
            onClick={togglePush}
            disabled={togglingPush}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              pushEnabled ? 'bg-brand' : 'bg-gray-300'
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

      {/* ── Duas colunas: Fila + Urgentes (sempre visíveis quando aprovado) ── */}
      {isApproved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FilaPanel     onAccepted={onConsultaAceita} onCardClick={handleCardClick} hasEmAtendimento={hasEmAtendimento} />
          <UrgentesPanel onAccepted={onConsultaAceita} onCardClick={handleCardClick} hasEmAtendimento={hasEmAtendimento} disponivelUrgencias={disponivelUrgencias} />
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
                ? 'border-brand text-brand-deep'
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
      {activeTab === 'agenda'     && <AgendaTab />}
      {activeTab === 'templates'  && <TemplatesTab />}
      {activeTab === 'consultas'  && <MyAppointments />}
      {activeTab === 'ganhos'     && <GanhosTab />}
      {activeTab === 'avaliacoes' && <AvaliacoesTab />}
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
