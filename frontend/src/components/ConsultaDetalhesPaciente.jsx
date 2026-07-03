import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ReceitaViewer from './ReceitaViewer';
import OndeComprar from './OndeComprar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_LABEL = {
  aguardando:           'Aguardando farmacêutico',
  aceito:               'Confirmada',
  em_atendimento:       'Em atendimento',
  concluido:            'Concluída',
  cancelado:            'Cancelada',
  expirado:             'Expirada',
  remarcacao_pendente:  'Remarcação pendente',
  AGENDADO:             'Confirmada',
  CONCLUIDO:            'Concluída',
  CANCELADO:            'Cancelada',
  PENDENTE_PAGAMENTO:   'Aguardando pagamento',
  EXPIRADA:             'Expirada',
};

const STATUS_DOT = {
  aguardando: '#9ca3af', aceito: '#2563eb', em_atendimento: '#16a34a',
  concluido: '#7c3aed', cancelado: '#dc2626', expirado: '#9ca3af',
  remarcacao_pendente: '#d97706',
  AGENDADO: '#2563eb', CONCLUIDO: '#7c3aed', CANCELADO: '#dc2626',
  PENDENTE_PAGAMENTO: '#d97706', EXPIRADA: '#9ca3af',
};

const TIPO_LABEL = { urgente: 'Urgente', agendada: 'Agendada', appointment: 'Consulta' };

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }) : '—';

const fmtMoney = (n) =>
  n != null ? `R$ ${Number(n).toFixed(2).replace('.', ',')}` : null;

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
    <span style={{ color: '#6b7280', flexShrink: 0 }}>{label}</span>
    <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right' }}>{value}</span>
  </div>
);

const ConsultaDetalhesPaciente = ({ id, tipo, onClose, onCancelled, onAgendar }) => {
  const { token } = useAuth();
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelError,   setCancelError]   = useState('');
  const [cancelToast,   setCancelToast]   = useState(null);
  const [downloading,   setDownloading]   = useState(false);
  const [showReceita,   setShowReceita]   = useState(false);
  const [parceiros,       setParceiros]       = useState([]);
  const [ondeComprarAtivo, setOndeComprarAtivo] = useState(false);

  // ── Remarcação ────────────────────────────────────────────────────────────────
  const [showRemarcarForm, setShowRemarcarForm]     = useState(false);
  const [novaDataHora, setNovaDataHora]             = useState('');
  const [remarcandoLoading, setRemarcandoLoading]   = useState(false);
  const [remarcandoError, setRemarcandoError]       = useState('');
  const [respondendoLoading, setRespondendoLoading] = useState(false);
  const [respostaError, setRespostaError]           = useState('');
  const [showOutroHorario, setShowOutroHorario]     = useState(false);
  const [outroHorario, setOutroHorario]             = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    fetch(`${API_URL}/api/paciente/consulta/${id}?tipo=${tipo}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : r.json().then((d) => Promise.reject(d.error || 'Erro ao buscar detalhes.')))
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setFetchError(String(err)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id, tipo, token]);

  // Carrega parceiros "Onde comprar" (apenas para consultas concluídas)
  useEffect(() => {
    fetch(`${API_URL}/api/parceiros`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setOndeComprarAtivo(d.ativo ?? false);
        setParceiros(d.parceiros ?? []);
      })
      .catch(() => {});
  }, [token]);

  const handleCancelar = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      const endpoint = tipo === 'urgente'
        ? `${API_URL}/api/fila/urgente/${id}/cancelar`
        : `${API_URL}/api/fila/agendadas/${id}/cancelar`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        const devolvido = result.creditoDevolvido ?? 0;
        onCancelled?.();
        if (devolvido > 0) {
          setCancelToast(`Consulta cancelada. R$ ${devolvido.toFixed(2).replace('.', ',')} devolvidos à sua carteira.`);
          setTimeout(onClose, 3000);
        } else {
          onClose();
        }
      } else {
        const d = await res.json().catch(() => ({}));
        setCancelError(d.error || 'Não foi possível cancelar.');
        setCancelling(false);
        setConfirmCancel(false);
      }
    } catch {
      setCancelError('Erro de conexão. Tente novamente.');
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/paciente/consulta/${id}/pdf?tipo=${tipo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('PDF não disponível.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `receita-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleRemarcar = async () => {
    if (!novaDataHora) { setRemarcandoError('Selecione a nova data e hora.'); return; }
    setRemarcandoLoading(true);
    setRemarcandoError('');
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/remarcar`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tipo, novaDataHora }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setData((d) => ({ ...d, dataHora: novaDataHora, remarcacoes: (d.remarcacoes ?? 0) + 1 }));
        setShowRemarcarForm(false);
        setNovaDataHora('');
        onCancelled?.();
      } else {
        setRemarcandoError(result.error || 'Erro ao remarcar.');
      }
    } catch { setRemarcandoError('Falha de conexão.'); }
    finally   { setRemarcandoLoading(false); }
  };

  const handleResponderRemarcacao = async (acao, novaDataHoraResposta = null) => {
    setRespondendoLoading(true);
    setRespostaError('');
    try {
      const body = { tipo, acao };
      if (novaDataHoraResposta) body.novaDataHora = novaDataHoraResposta;
      const res = await fetch(`${API_URL}/api/consulta/${id}/responder-remarcacao`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        if (acao === 'cancelar') {
          onCancelled?.();
          onClose();
        } else {
          const refresh = await fetch(`${API_URL}/api/paciente/consulta/${id}?tipo=${tipo}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (refresh.ok) setData(await refresh.json());
          setShowOutroHorario(false);
          setOutroHorario('');
          onCancelled?.();
        }
      } else {
        setRespostaError(result.error || 'Erro ao responder.');
      }
    } catch { setRespostaError('Falha de conexão.'); }
    finally   { setRespondendoLoading(false); }
  };

  const isFuture    = data && ['aguardando', 'aceito', 'remarcacao_pendente', 'AGENDADO', 'PENDENTE_PAGAMENTO'].includes(data.status);
  const isConcluded = data && ['concluido', 'CONCLUIDO'].includes(data.status);
  const isCancelled = data && ['cancelado', 'CANCELADO', 'expirado', 'EXPIRADA'].includes(data.status);
  const canCancel   = isFuture && tipo !== 'appointment';
  const dotColor    = STATUS_DOT[data?.status] ?? '#9ca3af';
  const hasReceita  = data && (Array.isArray(data.receita) && data.receita.length > 0);

  return (
    <>
    {showReceita && data && (
      <ReceitaViewer
        consultaId={id}
        tipo={tipo}
        data={data}
        onClose={() => setShowReceita(false)}
      />
    )}
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-md"
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px 16px 0 0' }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Detalhes da consulta</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 28px' }}>
          {cancelToast && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#15803d', fontWeight: 600, margin: 0 }}>✓ {cancelToast}</p>
            </div>
          )}
          {loading && (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 32 }}>Carregando...</p>
          )}
          {fetchError && (
            <p style={{ color: '#dc2626', fontSize: 14, textAlign: 'center', marginTop: 32 }}>{fetchError}</p>
          )}

          {data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Status + tipo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontWeight: 600,
                  color: dotColor,
                  background: dotColor + '18',
                  padding: '4px 10px', borderRadius: 20,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                  {STATUS_LABEL[data.status] ?? data.status}
                </span>
                <span style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 12 }}>
                  {TIPO_LABEL[data.tipo] ?? data.tipo}
                </span>
              </div>

              {/* Info */}
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoRow label="Data / hora"     value={fmtDateTime(data.dataHora)} />
                {data.pessoaNome && <InfoRow label="Para"       value={data.pessoaNome} />}
                {data.farmaceutico?.nome && <InfoRow label="Farmacêutico(a)" value={data.farmaceutico.nome} />}
                {fmtMoney(data.creditoDebitado) && <InfoRow label="Valor"   value={fmtMoney(data.creditoDebitado)} />}
              </div>

              {/* ── FUTURA ─────────────────────────────────────── */}
              {isFuture && (
                <>
                  {/* Proposta de remarcação pelo farmacêutico */}
                  {data.status === 'remarcacao_pendente' && data.remarcacaoPendente && (() => {
                    const p = data.remarcacaoPendente;
                    const novaData = p.novaDataHora
                      ? new Date(p.novaDataHora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })
                      : null;
                    const expira = p.expiraEm
                      ? new Date(p.expiraEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      : null;
                    const min2h = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
                    return (
                      <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '14px' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: '0 0 6px' }}>
                          📅 Farmacêutico propôs remarcar
                        </p>
                        {novaData && (
                          <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 4px' }}>
                            Nova data: <strong>{novaData}</strong>
                          </p>
                        )}
                        {p.motivo && (
                          <p style={{ fontSize: 12, color: '#a16207', margin: '0 0 4px', fontStyle: 'italic' }}>
                            Motivo: "{p.motivo}"
                          </p>
                        )}
                        {expira && (
                          <p style={{ fontSize: 11, color: '#b45309', margin: '0 0 12px' }}>
                            Válido até: {expira}
                          </p>
                        )}
                        {respostaError && (
                          <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 8px' }}>{respostaError}</p>
                        )}
                        {!showOutroHorario ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button
                              onClick={() => handleResponderRemarcacao('aceitar')}
                              disabled={respondendoLoading}
                              style={{ padding: '9px 0', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: respondendoLoading ? 'not-allowed' : 'pointer', opacity: respondendoLoading ? 0.6 : 1 }}
                            >
                              {respondendoLoading ? '...' : '✓ Aceitar nova data'}
                            </button>
                            <button
                              onClick={() => setShowOutroHorario(true)}
                              disabled={respondendoLoading}
                              style={{ padding: '9px 0', background: 'white', color: '#d97706', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            >
                              📅 Escolher outro horário
                            </button>
                            <button
                              onClick={() => handleResponderRemarcacao('cancelar')}
                              disabled={respondendoLoading}
                              style={{ padding: '9px 0', background: 'white', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: respondendoLoading ? 'not-allowed' : 'pointer', opacity: respondendoLoading ? 0.6 : 1 }}
                            >
                              Cancelar com reembolso
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#78350f' }}>Nova data e hora:</label>
                            <input
                              type="datetime-local"
                              value={outroHorario}
                              min={min2h}
                              onChange={(e) => setOutroHorario(e.target.value)}
                              style={{ border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'white' }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => { setShowOutroHorario(false); setOutroHorario(''); }}
                                style={{ flex: 1, padding: '9px 0', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                                Voltar
                              </button>
                              <button
                                onClick={() => handleResponderRemarcacao('outro', outroHorario)}
                                disabled={!outroHorario || respondendoLoading}
                                style={{ flex: 2, padding: '9px 0', background: '#d97706', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (!outroHorario || respondendoLoading) ? 'not-allowed' : 'pointer', opacity: (!outroHorario || respondendoLoading) ? 0.6 : 1 }}>
                                {respondendoLoading ? '...' : 'Confirmar horário'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Ações normais (exceto quando remarcacao_pendente) */}
                  {data.status !== 'remarcacao_pendente' && (
                    <>
                      {data.meetLink ? (
                        <a
                          href={data.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'block', textAlign: 'center', padding: '12px 0',
                            background: '#1a73e8', color: 'white', borderRadius: 10,
                            fontWeight: 700, fontSize: 14, textDecoration: 'none',
                          }}
                        >
                          🎥 Entrar no Google Meet
                        </a>
                      ) : (
                        <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '4px 0' }}>
                          O link da reunião será informado pelo farmacêutico.
                        </p>
                      )}

                      {/* Remarcar consulta (paciente-iniciado) */}
                      {data.status === 'aceito' && tipo === 'agendada' && (data.remarcacoes ?? 0) < 2 && !showRemarcarForm && (
                        <button
                          onClick={() => setShowRemarcarForm(true)}
                          style={{ padding: '11px 0', background: 'white', border: '1.5px solid #7c3aed', borderRadius: 10, color: '#7c3aed', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                        >
                          📅 Remarcar consulta
                        </button>
                      )}
                      {showRemarcarForm && (
                        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '14px' }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#5b21b6', margin: '0 0 10px' }}>Remarcar consulta</p>
                          <p style={{ fontSize: 12, color: '#7c3aed', margin: '0 0 10px' }}>
                            Restam {2 - (data.remarcacoes ?? 0)} remarcação(ões). Selecione a nova data com pelo menos 2h de antecedência.
                          </p>
                          <input
                            type="datetime-local"
                            value={novaDataHora}
                            min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                            onChange={(e) => setNovaDataHora(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'white', marginBottom: 10 }}
                          />
                          {remarcandoError && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 8px' }}>{remarcandoError}</p>}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setShowRemarcarForm(false); setNovaDataHora(''); setRemarcandoError(''); }}
                              style={{ flex: 1, padding: '9px 0', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                              Cancelar
                            </button>
                            <button
                              onClick={handleRemarcar}
                              disabled={remarcandoLoading || !novaDataHora}
                              style={{ flex: 2, padding: '9px 0', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (remarcandoLoading || !novaDataHora) ? 'not-allowed' : 'pointer', opacity: (remarcandoLoading || !novaDataHora) ? 0.6 : 1 }}>
                              {remarcandoLoading ? 'Salvando...' : 'Confirmar remarcação'}
                            </button>
                          </div>
                        </div>
                      )}

                      {canCancel && !confirmCancel && (
                        <button
                          onClick={() => setConfirmCancel(true)}
                          style={{
                            padding: '11px 0', background: 'white',
                            border: '1.5px solid #fca5a5', borderRadius: 10,
                            color: '#dc2626', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Cancelar consulta
                        </button>
                      )}

                      {canCancel && confirmCancel && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px' }}>
                          <p style={{ fontSize: 13, color: '#991b1b', fontWeight: 600, margin: '0 0 12px' }}>
                            Confirma o cancelamento?{data?.creditoDebitado > 0
                              ? ` Você receberá R$ ${Number(data.creditoDebitado).toFixed(2).replace('.', ',')} de volta na sua carteira.`
                              : ' A consulta será cancelada.'}
                          </p>
                          {cancelError && (
                            <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 10px' }}>{cancelError}</p>
                          )}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => { setConfirmCancel(false); setCancelError(''); }}
                              style={{ flex: 1, padding: '9px 0', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                            >
                              Voltar
                            </button>
                            <button
                              onClick={handleCancelar}
                              disabled={cancelling}
                              style={{ flex: 1, padding: '9px 0', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1 }}
                            >
                              {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── CONCLUÍDA ──────────────────────────────────── */}
              {isConcluded && (
                <>
                  {data.observacoes && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Orientações do farmacêutico
                      </p>
                      <p style={{ fontSize: 14, color: '#15803d', lineHeight: 1.6, margin: 0 }}>{data.observacoes}</p>
                    </div>
                  )}

                  {data.motivo && (
                    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Motivo da consulta
                      </p>
                      <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{data.motivo}</p>
                    </div>
                  )}

                  {Array.isArray(data.receita) && data.receita.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Receita
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {data.receita.map((item, i) => (
                          <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#374151' }}>
                            <span style={{ fontWeight: 600 }}>{item.medicamento}</span>
                            {item.dosagem && <span style={{ color: '#6b7280' }}> — {item.dosagem}</span>}
                            {item.instrucoes && (
                              <p style={{ margin: '3px 0 0', color: '#9ca3af', fontSize: 12 }}>{item.instrucoes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão Ver receita (inline viewer) */}
                  {hasReceita && tipo !== 'appointment' && (
                    <button
                      onClick={() => setShowReceita(true)}
                      style={{
                        padding: '11px 0', background: '#7c3aed', color: 'white',
                        border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📄 Ver receita
                    </button>
                  )}

                  {/* Botão Baixar PDF separado (quando PDF está gerado) */}
                  {data.receitaPdfUrl && tipo !== 'appointment' && (
                    <button
                      onClick={handleDownloadPdf}
                      disabled={downloading}
                      style={{
                        padding: '11px 0', background: 'white', color: '#7c3aed',
                        border: '1.5px solid #ddd6fe', borderRadius: 10, fontSize: 14, fontWeight: 700,
                        cursor: downloading ? 'wait' : 'pointer', opacity: downloading ? 0.7 : 1,
                      }}
                    >
                      {downloading ? 'Baixando...' : '⬇ Baixar PDF'}
                    </button>
                  )}

                  {/* Seção Onde Comprar */}
                  {isConcluded && ondeComprarAtivo && parceiros.length > 0 && (
                    <OndeComprar
                      parceiros={parceiros}
                      consultaId={id}
                      itens={data?.receita}
                      token={token}
                    />
                  )}

                  {onAgendar && (
                    <button
                      onClick={() => { onClose(); onAgendar(); }}
                      style={{
                        padding: '11px 0', background: 'white',
                        border: '1.5px solid #7c3aed', borderRadius: 10,
                        color: '#7c3aed', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      📅 Agendar nova consulta
                    </button>
                  )}
                </>
              )}

              {/* ── CANCELADA / EXPIRADA ───────────────────────── */}
              {isCancelled && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.creditoDebitado > 0 && (
                    <p style={{ fontSize: 14, color: '#991b1b', margin: 0, fontWeight: 600 }}>
                      {fmtMoney(data.creditoDebitado)} devolvidos ao seu saldo.
                    </p>
                  )}
                  {data.motivoCancelamento && (
                    <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>
                      Motivo: {data.motivoCancelamento}
                    </p>
                  )}
                  {!data.motivoCancelamento && !data.creditoDebitado && (
                    <p style={{ fontSize: 14, color: '#991b1b', margin: 0 }}>Consulta cancelada.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ConsultaDetalhesPaciente;
