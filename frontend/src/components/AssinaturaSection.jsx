import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, TriangleAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmPowerAction from './admin/ConfirmPowerAction.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fmtData = (iso) => iso
  ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

const STATUS_LABEL = {
  ativa:        { label: 'Ativa',        cls: 'text-success' },
  trial:        { label: 'Em teste grátis', cls: 'text-success' },
  pendente:     { label: 'Aguardando confirmação', cls: 'text-alert' },
  inadimplente: { label: 'Pagamento pendente', cls: 'text-error' },
};

// Seção de assinatura mensal no perfil do paciente — sibling de
// AlterarSenhaForm/TotpSetupForm dentro de PerfilModal.
const AssinaturaSection = () => {
  const { token } = useAuth();
  const [assinatura, setAssinatura] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [iniciando, setIniciando]   = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/assinaturas/minha`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAssinatura(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  const iniciar = async () => {
    setIniciando(true);
    setMsg('');
    try {
      const res  = await fetch(`${API_URL}/api/assinaturas/iniciar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setMsgType('error'); setMsg(data.error || 'Erro ao iniciar assinatura.'); return; }
      window.location.href = data.init_point;
    } catch {
      setMsgType('error');
      setMsg('Falha de conexão.');
    } finally {
      setIniciando(false);
    }
  };

  const cancelar = async () => {
    setCancelando(true);
    try {
      const res  = await fetch(`${API_URL}/api/assinaturas/cancelar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setMsgType('error'); setMsg(data.error || 'Erro ao cancelar assinatura.'); return; }
      setMsgType('success');
      setMsg(`Assinatura cancelada. Você mantém acesso até ${fmtData(data.acesso_ate)}.`);
      setShowConfirm(false);
      carregar();
    } catch {
      setMsgType('error');
      setMsg('Falha de conexão.');
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return <p className="text-xs text-muted">Carregando assinatura...</p>;
  }

  return (
    <div className="bg-surface border border-line rounded-xl px-4 py-3.5">
      {!assinatura?.ativa ? (
        <>
          <p className="text-sm text-ink font-semibold mb-1">Nenhuma assinatura ativa</p>
          <p className="text-xs text-muted mb-3">
            Assine o plano mensal e tenha consultas incluídas todo mês, sem precisar recarregar créditos.
          </p>
          <button
            onClick={iniciar}
            disabled={iniciando}
            className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-deep disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            {iniciando ? 'Redirecionando...' : 'Assinar plano mensal'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-ink">{assinatura.plano.nome}</p>
            <span className={`text-xs font-bold ${STATUS_LABEL[assinatura.status]?.cls || 'text-muted'}`}>
              {STATUS_LABEL[assinatura.status]?.label || assinatura.status}
            </span>
          </div>
          <p className="text-xs text-muted mb-0.5">
            {assinatura.consultasRestantes} de {assinatura.plano.consultasIncluidas} consulta(s) restante(s) neste ciclo
          </p>
          <p className="text-xs text-muted mb-3">
            Ciclo atual até {fmtData(assinatura.cicloAtualFim)}
            {assinatura.emTrial && assinatura.trialFim && ` · trial até ${fmtData(assinatura.trialFim)}`}
          </p>
          {assinatura.canceladaEm ? (
            <p className="text-xs text-alert font-semibold">
              Cancelamento agendado — acesso mantido até {fmtData(assinatura.cicloAtualFim)}.
            </p>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-xs font-semibold text-error hover:underline"
            >
              Cancelar assinatura
            </button>
          )}
        </>
      )}

      {msg && (
        <p className={`text-xs font-medium mt-2 inline-flex items-center gap-1.5 ${msgType === 'success' ? 'text-success' : 'text-error'}`}>
          {msgType === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
          {msg}
        </p>
      )}

      {showConfirm && (
        <ConfirmPowerAction
          title="Cancelar assinatura"
          name="Sua assinatura"
          message="será cancelada. Você continua com acesso às consultas incluídas até o fim do ciclo atual — sem estorno do período já pago."
          alertText="Essa ação não pode ser desfeita. Para assinar novamente, será preciso iniciar uma nova assinatura."
          confirmLabel="Cancelar assinatura"
          confirmingLabel="Cancelando..."
          loading={cancelando}
          onCancel={() => setShowConfirm(false)}
          onConfirm={cancelar}
        />
      )}
    </div>
  );
};

export default AssinaturaSection;
