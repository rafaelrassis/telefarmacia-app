import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Zap, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PRECO_CONSULTA } from '../../utils/patientDashboardFormat';
import TermoConsentimento from '../TermoConsentimento';
import TriagemForm from '../TriagemForm';
import PassarAgoraResultPanel from './PassarAgoraResultPanel';
import { uploadReceitaAnexo } from '../../utils/uploadReceitaAnexo.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AgendamentoButtons = ({
  walletBalance, sistemaAberto, sistemaMotivo, sistemaProximaAbertura, selectedPerson, dependentes,
  setAppointmentsRefreshKey, fetchWalletBalance, maybeRequestPush,
  onOpenDataModal, onOpenWalletTopup,
}) => {
  const { token, user } = useAuth();
  const [passarAgoraLoading, setPassarAgoraLoading] = useState(false);
  const [passarAgoraMsg, setPassarAgoraMsg] = useState(null);
  const [showTriagemUrgente, setShowTriagemUrgente] = useState(false);
  const [showConsentUrgente, setShowConsentUrgente] = useState(false);
  const [consentUrgenteOk, setConsentUrgenteOk] = useState(null);
  const [filaInfo, setFilaInfo] = useState(null);
  const [disponibilidadeUrgente, setDisponibilidadeUrgente] = useState(null); // { disponivel, total }
  const urgentIdRef = useRef(null);

  // Indicador de disponibilidade no card "Falar agora" — mesmo endpoint já usado
  // ao clicar; aqui só antecipamos a checagem para mostrar antes do clique.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/fila/urgente/disponibilidade`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !cancelled) setDisponibilidadeUrgente(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Verifica se já existe uma urgência ativa ao montar o dashboard
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

  const handlePassarAgora = async (triagem = null, receitaAnexoFile = null) => {
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
        if (receitaAnexoFile) {
          uploadReceitaAnexo(token, data.id, 'urgente', receitaAnexoFile).catch(() => {});
        }
      }
    } catch {
      setPassarAgoraMsg({ type: 'error', mensagem: 'Falha de conexão. Tente novamente.' });
    } finally {
      setPassarAgoraLoading(false);
    }
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

  // Posição na fila / farmacêuticos online — atualiza em paralelo ao poll de status,
  // num ritmo mais espaçado (não precisa da mesma frequência que a detecção de aceite).
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
  }, [passarAgoraMsg?.type, token, fetchWalletBalance, setAppointmentsRefreshKey]);

  const saldoInsuficiente = walletBalance !== null && walletBalance < PRECO_CONSULTA;
  const urgenteBloqueado  = passarAgoraMsg?.type === 'waiting';
  const sistemaFechado    = sistemaAberto === false;
  // Regra replicada do comportamento anterior: com o sistema fechado, o próprio
  // agendamento por este componente também fica bloqueado (o componente inteiro
  // deixava de renderizar); outros pontos de entrada (retorno sugerido, "agendar
  // nova consulta" a partir dos detalhes) continuam abrindo o modal normalmente.
  const agendarBloqueado  = sistemaFechado || saldoInsuficiente;
  const urgenteDesabilitado = sistemaFechado || passarAgoraLoading || saldoInsuficiente || urgenteBloqueado;

  return (
    <>
      {sistemaFechado && (
        <div className="bg-alert-wash border border-alert/30 rounded-xl px-4 py-3 flex items-center gap-3 mb-3">
          <Clock className="w-5 h-5 text-alert shrink-0" strokeWidth={2.5} />
          <div>
            <p className="text-sm font-semibold text-alert">Fora do horário de atendimento</p>
            <p className="text-xs text-alert mt-0.5">
              {sistemaProximaAbertura
                ? `Abre ${sistemaProximaAbertura.dia} às ${sistemaProximaAbertura.hora}`
                : (sistemaMotivo || 'Tente novamente mais tarde.')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenDataModal}
          disabled={agendarBloqueado}
          title={
            sistemaFechado    ? 'Fora do horário de atendimento' :
            saldoInsuficiente ? 'Saldo insuficiente — adicione créditos para continuar' :
            undefined
          }
          className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
            agendarBloqueado
              ? 'border-line bg-surface opacity-55 cursor-not-allowed'
              : 'border-line bg-canvas hover:border-brand/60 cursor-pointer'
          }`}
        >
          <span className="w-9 h-9 rounded-full bg-brand-wash flex items-center justify-center text-brand-deep shrink-0">
            <Calendar className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <span className="font-heading text-sm font-bold text-ink">Agendar consulta</span>
          <span className="text-xs text-muted leading-snug">Escolha data e horário com um farmacêutico</span>
        </button>

        <button
          onClick={async () => {
            // Verifica disponibilidade antes de mostrar triagem
            try {
              const dr = await fetch(`${API_URL}/api/fila/urgente/disponibilidade`);
              const dd = dr.ok ? await dr.json() : null;
              if (dd) setDisponibilidadeUrgente(dd);
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
          disabled={urgenteDesabilitado}
          title={
            sistemaFechado    ? 'Fora do horário de atendimento' :
            urgenteBloqueado  ? 'Você já tem um atendimento urgente em andamento' :
            saldoInsuficiente ? 'Saldo insuficiente — adicione créditos para continuar' :
            undefined
          }
          className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
            urgenteDesabilitado
              ? 'border-line bg-surface opacity-55 cursor-not-allowed'
              : 'border-brand bg-brand-wash hover:bg-brand/15 cursor-pointer'
          }`}
        >
          <span className="w-9 h-9 rounded-full bg-brand-deep flex items-center justify-center text-white shrink-0">
            <Zap className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <span className="font-heading text-sm font-bold text-ink">
            {passarAgoraLoading ? 'Solicitando...' : 'Falar agora'}
          </span>
          <span className="text-xs text-muted leading-snug">
            {!sistemaFechado && disponibilidadeUrgente
              ? (disponibilidadeUrgente.disponivel
                  ? `${disponibilidadeUrgente.total} farmacêutico${disponibilidadeUrgente.total !== 1 ? 's' : ''} online agora`
                  : 'Nenhum farmacêutico online agora')
              : 'Atendimento imediato pelo WhatsApp'}
          </span>
        </button>
      </div>
      {saldoInsuficiente && (
        <p className="text-[13px] text-error text-center mt-1">
          Saldo insuficiente — adicione créditos para continuar
        </p>
      )}

      {/* Resultado inline do "Quero Passar Agora" */}
      <PassarAgoraResultPanel
        passarAgoraMsg={passarAgoraMsg}
        filaInfo={filaInfo}
        handleCancelarUrgente={handleCancelarUrgente}
        onAgendarHorario={() => { setPassarAgoraMsg(null); onOpenDataModal(); }}
        onOpenWalletTopup={onOpenWalletTopup}
        onDismiss={() => { setPassarAgoraMsg(null); urgentIdRef.current = null; }}
      />

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
              onConfirm={(triagem, receitaAnexoFile) => {
                setShowTriagemUrgente(false);
                handlePassarAgora(triagem, receitaAnexoFile);
              }}
              pacienteNome={user?.name || ''}
              preSelectedPerson={selectedPerson}
              dependentes={dependentes}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AgendamentoButtons;
