import React, { useState, useEffect, useCallback } from 'react';
import { CircleCheck, Ban, Clock, Zap, ZapOff, Bell, BellOff, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MyAppointments from './MyAppointments';
import PharmacistProfileEditor from './PharmacistProfileEditor';
import DocUploadForm from './DocUploadForm';
import ConsultaModal from './ConsultaModal';
import GanhosTab from './GanhosTab';
import AvaliacoesTab from './AvaliacoesTab';
import Badge from './ui/Badge';
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '../utils/push';
import FilaPanel from './pharmacist/FilaPanel';
import UrgentesPanel from './pharmacist/UrgentesPanel';
import UrgentesAceitasPanel from './pharmacist/UrgentesAceitasPanel';
import CalendarioTab from './pharmacist/CalendarioTab';
import AgendaTab from './pharmacist/AgendaTab';
import TemplatesTab from './pharmacist/TemplatesTab';
import ResumoDoDia from './pharmacist/ResumoDoDia';
import { getPharmacistStatus } from '../utils/pharmacistFormat';

const STATUS_BADGE = {
  ativo:    { variant: 'success', icon: CircleCheck },
  suspenso: { variant: 'error',   icon: Ban },
  pendente: { variant: 'alert',   icon: Clock },
};

// Controle compacto de switch usado no header (disponibilidade p/ urgências, push)
const ToggleRow = ({ icon: Icon, label, title, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-3 border border-line rounded-xl px-3.5 py-2 bg-canvas" title={title}>
    <div className="flex items-center gap-2 min-w-0">
      <Icon className={`w-4 h-4 shrink-0 ${checked ? 'text-brand' : 'text-muted'}`} strokeWidth={2} />
      <p className="text-xs font-medium text-ink truncate">{label}</p>
    </div>
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-brand' : 'bg-line'
      }`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-canvas shadow ring-0 transition duration-200 ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`} />
    </button>
  </div>
);

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
  const [activeTab, setActiveTab]         = useState('calendario');
  const [showDocForm, setShowDocForm]     = useState(false);
  const [calendarTrigger, setCalendarTrigger] = useState(0);
  const [consultaAlvo, setConsultaAlvo]       = useState(null);
  const [emAtendimento, setEmAtendimento]     = useState(null); // { id, tipo } | null
  const [togglingDisponivel, setTogglingDisponivel] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  const status              = getPharmacistStatus(user?.pharmacistProfile);
  const isApproved          = status.key === 'ativo';
  const isSuspenso          = status.key === 'suspenso';
  const docEnviado          = status.docEnviado;
  const disponivelUrgencias = user?.pharmacistProfile?.disponivelUrgencias ?? true;
  const primeiroNome        = (user?.name || '').split(' ')[0];
  const statusBadge         = STATUS_BADGE[status.key];
  const hasEmAtendimento    = Boolean(emAtendimento);

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
        const atual = data.items?.[0];
        setEmAtendimento(atual ? { id: atual.id, tipo: atual.tipo } : null);
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

      {/* Header: saudação + status + toggles de estação de trabalho */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink">Olá, {primeiroNome}</h1>
          <div className="mt-1.5">
            <Badge variant={statusBadge.variant}>
              <statusBadge.icon className="w-3 h-3" strokeWidth={2.5} />
              {status.label}
            </Badge>
          </div>
        </div>

        {isApproved && (
          <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
            <ToggleRow
              icon={disponivelUrgencias ? Zap : ZapOff}
              label="Disponível p/ urgências"
              title={disponivelUrgencias
                ? 'Você aparece na fila de urgências e pode ser acionado'
                : 'Você não recebe novas urgências. Consultas agendadas não são afetadas.'}
              checked={disponivelUrgencias}
              onChange={toggleDisponivelUrgencias}
              disabled={togglingDisponivel}
            />
            {isPushSupported() && (
              <ToggleRow
                icon={pushEnabled ? Bell : BellOff}
                label="Notificações push"
                title={pushEnabled
                  ? 'Você recebe um alerta no celular/navegador quando surge uma urgência'
                  : 'Ative para ser avisado de novas urgências mesmo com o app fechado'}
                checked={pushEnabled}
                onChange={togglePush}
                disabled={togglingPush}
              />
            )}
          </div>
        )}
      </div>

      {/* Banner de conta suspensa */}
      {isSuspenso && (
        <div className="mb-5 bg-error-wash border border-error/30 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <Ban className="w-5 h-5 text-error shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="font-heading font-semibold text-error text-sm">Conta suspensa</p>
            <p className="text-xs text-error mt-0.5">
              Sua conta foi suspensa por um administrador e não recebe novas consultas no momento.
              Entre em contato com o suporte se acredita que isso é um engano.
            </p>
          </div>
        </div>
      )}

      {/* Banner de aprovação pendente */}
      {!isApproved && !isSuspenso && (
        <div className="mb-5 space-y-3">
          <div className="bg-alert-wash border border-alert/30 rounded-xl px-4 py-3.5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-alert shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="font-heading font-semibold text-alert text-sm">Conta aguardando aprovação</p>
              <p className="text-xs text-alert mt-0.5">
                {docEnviado
                  ? 'Documentos enviados. Um administrador irá analisar seu CRF e seus documentos — assim que aprovado, sua conta é liberada automaticamente e você recebe um aviso aqui.'
                  : 'Envie seus documentos para que um administrador possa analisar e ativar seu cadastro.'}
              </p>
            </div>
          </div>

          {!docEnviado && (
            <div className="bg-canvas border border-line rounded-xl p-5">
              {showDocForm ? (
                <DocUploadForm onSuccess={async () => { setShowDocForm(false); await refreshUser(); }} />
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-muted shrink-0" strokeWidth={2} />
                    <div>
                      <p className="text-sm font-semibold text-ink">Enviar documentos</p>
                      <p className="text-xs text-muted mt-0.5">RG/CNH e carteira do CRF são necessários para ativação.</p>
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

      {isApproved && <ResumoDoDia token={token} refreshTrigger={calendarTrigger} />}

      {/* ── Atendimento em andamento ─────────────────────────────────────── */}
      {isApproved && hasEmAtendimento && (
        <div className="flex items-center justify-between gap-3 bg-success-wash border border-success/30 rounded-xl px-4 py-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <p className="text-xs font-semibold text-success">Atendimento em andamento</p>
          </div>
          <button
            onClick={() => handleCardClick(emAtendimento)}
            className="text-xs font-bold text-success underline underline-offset-2 hover:opacity-80"
          >
            Reabrir
          </button>
        </div>
      )}

      {/* ── Atendimentos: hierarquia por criticidade ────────────────────── */}
      {isApproved && (
        <section className="mb-6">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Atendimentos</h2>
          <div className="flex flex-col gap-4">
            <UrgentesPanel
              onAccepted={onConsultaAceita}
              onCardClick={handleCardClick}
              hasEmAtendimento={hasEmAtendimento}
              disponivelUrgencias={disponivelUrgencias}
            />
            <UrgentesAceitasPanel onCardClick={handleCardClick} refreshTrigger={calendarTrigger} />
            <FilaPanel
              onAccepted={onConsultaAceita}
              onCardClick={handleCardClick}
              hasEmAtendimento={hasEmAtendimento}
            />
          </div>
        </section>
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
        <CalendarioTab refreshTrigger={calendarTrigger} onEventClick={handleEventClick} />
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
