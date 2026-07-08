import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PRECO_CONSULTA } from '../../utils/patientDashboardFormat';
import TermoConsentimento from '../TermoConsentimento';
import TriagemForm from '../TriagemForm';
import PassarAgoraResultPanel from './PassarAgoraResultPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AgendamentoButtons = ({
  walletBalance, sistemaAberto, selectedPerson, dependentes,
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
  const urgentIdRef = useRef(null);

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

  if (sistemaAberto === false) return null;

  const saldoInsuficiente = walletBalance !== null && walletBalance < PRECO_CONSULTA;
  const urgenteBloqueado  = passarAgoraMsg?.type === 'waiting';

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', margin: '16px 0' }}>
        <button
          onClick={onOpenDataModal}
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
    </>
  );
};

export default AgendamentoButtons;
