import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ReceitaViewer from './ReceitaViewer';
import OndeComprar from './OndeComprar';
import { abrirDocumentoAutenticado } from '../utils/abrirDocumentoAutenticado';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_LABEL = {
  aguardando:           'Aguardando farmacêutico',
  aceito:               'Confirmada',
  em_atendimento:       'Em atendimento',
  concluido:            'Concluída',
  cancelado:            'Cancelada',
  expirado:             'Expirada',
  remarcacao_pendente:  'Remarcação pendente',
};

const STATUS_DOT = {
  aguardando: 'var(--color-muted)', aceito: 'var(--color-brand)', em_atendimento: 'var(--color-success)',
  concluido: 'var(--color-success)', cancelado: 'var(--color-error)', expirado: 'var(--color-muted)',
  remarcacao_pendente: 'var(--color-alert)',
};

const STATUS_WASH = {
  aguardando: 'var(--color-line)', aceito: 'var(--color-brand-wash)', em_atendimento: 'var(--color-success-wash)',
  concluido: 'var(--color-success-wash)', cancelado: 'var(--color-error-wash)', expirado: 'var(--color-line)',
  remarcacao_pendente: 'var(--color-alert-wash)',
};

const TIPO_LABEL = { urgente: 'Urgente', agendada: 'Agendada' };

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }) : '—';

const fmtMoney = (n) =>
  n != null ? `R$ ${Number(n).toFixed(2).replace('.', ',')}` : null;

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between gap-3 text-[13px]">
    <span className="text-muted shrink-0">{label}</span>
    <span className="text-ink font-medium text-right">{value}</span>
  </div>
);

const ConsultaDetalhesPaciente = ({ id, tipo, onClose, onCancelled, onAgendar, initialShowRemarcarForm = false }) => {
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

  // Atalho vindo do hero: abre direto o formulário de remarcação quando aplicável
  useEffect(() => {
    if (!initialShowRemarcarForm || !data) return;
    if (data.status === 'aceito' && tipo === 'agendada' && (data.remarcacoes ?? 0) < 2) {
      setShowRemarcarForm(true);
    }
  }, [initialShowRemarcarForm, data, tipo]);

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

  const isFuture    = data && ['aguardando', 'aceito', 'remarcacao_pendente'].includes(data.status);
  const isConcluded = data && data.status === 'concluido';
  const isCancelled = data && ['cancelado', 'expirado'].includes(data.status);
  const canCancel   = isFuture;
  const dotColor    = STATUS_DOT[data?.status] ?? 'var(--color-muted)';
  const washColor   = STATUS_WASH[data?.status] ?? 'var(--color-line)';
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
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas border border-line w-full rounded-t-2xl shadow-md sm:max-w-md flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 pt-[18px] flex justify-between items-center shrink-0">
          <h2 className="text-base font-bold text-ink m-0">Detalhes da consulta</h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-[22px] cursor-pointer text-muted hover:text-ink leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 pt-4 pb-7">
          {cancelToast && (
            <div className="bg-success-wash border border-success/40 rounded-[10px] px-3.5 py-3 mb-3">
              <p className="text-[13px] text-success font-semibold m-0">✓ {cancelToast}</p>
            </div>
          )}
          {loading && (
            <p className="text-muted text-sm text-center mt-8">Carregando...</p>
          )}
          {fetchError && (
            <p className="text-error text-sm text-center mt-8">{fetchError}</p>
          )}

          {data && (
            <div className="flex flex-col gap-4">

              {/* Status + tipo */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: dotColor, background: washColor }}
                >
                  <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: dotColor }} />
                  {STATUS_LABEL[data.status] ?? data.status}
                </span>
                <span className="text-xs text-muted bg-surface px-2 py-[3px] rounded-xl">
                  {TIPO_LABEL[data.tipo] ?? data.tipo}
                </span>
              </div>

              {/* Info */}
              <div className="bg-surface rounded-[10px] px-3.5 py-3 flex flex-col gap-2">
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
                      <div className="bg-alert-wash border border-alert/40 rounded-[10px] p-3.5">
                        <p className="text-[13px] font-bold text-alert mb-1.5">
                          📅 Farmacêutico propôs remarcar
                        </p>
                        {novaData && (
                          <p className="text-[13px] text-alert mb-1">
                            Nova data: <strong>{novaData}</strong>
                          </p>
                        )}
                        {p.motivo && (
                          <p className="text-xs text-alert mb-1 italic">
                            Motivo: "{p.motivo}"
                          </p>
                        )}
                        {expira && (
                          <p className="text-[11px] text-alert mb-3">
                            Válido até: {expira}
                          </p>
                        )}
                        {respostaError && (
                          <p className="text-xs text-error mb-2">{respostaError}</p>
                        )}
                        {!showOutroHorario ? (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleResponderRemarcacao('aceitar')}
                              disabled={respondendoLoading}
                              className="py-2.5 bg-success text-success-contrast border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {respondendoLoading ? '...' : '✓ Aceitar nova data'}
                            </button>
                            <button
                              onClick={() => setShowOutroHorario(true)}
                              disabled={respondendoLoading}
                              className="py-2.5 bg-canvas text-alert border border-alert/40 rounded-lg text-[13px] font-bold cursor-pointer"
                            >
                              📅 Escolher outro horário
                            </button>
                            <button
                              onClick={() => handleResponderRemarcacao('cancelar')}
                              disabled={respondendoLoading}
                              className="py-2.5 bg-canvas text-error border border-error/40 rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Cancelar com reembolso
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-alert">Nova data e hora:</label>
                            <input
                              type="datetime-local"
                              value={outroHorario}
                              min={min2h}
                              onChange={(e) => setOutroHorario(e.target.value)}
                              className="border border-alert/40 rounded-lg px-2.5 py-2 text-[13px] text-ink bg-canvas outline-none"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => { setShowOutroHorario(false); setOutroHorario(''); }}
                                className="flex-1 py-2.5 bg-canvas border border-line rounded-lg text-[13px] text-ink cursor-pointer">
                                Voltar
                              </button>
                              <button
                                onClick={() => handleResponderRemarcacao('outro', outroHorario)}
                                disabled={!outroHorario || respondendoLoading}
                                className="flex-[2] py-2.5 bg-alert text-alert-contrast border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
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
                      <p className="text-[13px] text-muted text-center py-1">
                        {data.status === 'em_atendimento'
                          ? 'O farmacêutico está com você. Fique atento ao contato.'
                          : 'O farmacêutico entrará em contato no horário da consulta.'}
                      </p>

                      {/* Remarcar consulta (paciente-iniciado) */}
                      {data.status === 'aceito' && tipo === 'agendada' && (data.remarcacoes ?? 0) < 2 && !showRemarcarForm && (
                        <button
                          onClick={() => setShowRemarcarForm(true)}
                          className="py-2.5 bg-canvas border-[1.5px] border-brand rounded-[10px] text-brand text-sm font-semibold cursor-pointer"
                        >
                          📅 Remarcar consulta
                        </button>
                      )}
                      {showRemarcarForm && (
                        <div className="bg-brand-wash border border-brand/40 rounded-[10px] p-3.5">
                          <p className="text-[13px] font-bold text-brand-deep mb-2.5">Remarcar consulta</p>
                          <p className="text-xs text-brand-deep mb-2.5">
                            Restam {2 - (data.remarcacoes ?? 0)} remarcação(ões). Selecione a nova data com pelo menos 2h de antecedência.
                          </p>
                          <input
                            type="datetime-local"
                            value={novaDataHora}
                            min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                            onChange={(e) => setNovaDataHora(e.target.value)}
                            className="w-full box-border border border-brand/40 rounded-lg px-2.5 py-2 text-[13px] text-ink bg-canvas outline-none mb-2.5"
                          />
                          {remarcandoError && <p className="text-xs text-error mb-2">{remarcandoError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => { setShowRemarcarForm(false); setNovaDataHora(''); setRemarcandoError(''); }}
                              className="flex-1 py-2.5 bg-canvas border border-line rounded-lg text-[13px] text-ink cursor-pointer">
                              Cancelar
                            </button>
                            <button
                              onClick={handleRemarcar}
                              disabled={remarcandoLoading || !novaDataHora}
                              className="flex-[2] py-2.5 bg-brand text-brand-contrast border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                              {remarcandoLoading ? 'Salvando...' : 'Confirmar remarcação'}
                            </button>
                          </div>
                        </div>
                      )}

                      {canCancel && !confirmCancel && (
                        <button
                          onClick={() => setConfirmCancel(true)}
                          className="py-2.5 bg-canvas border-[1.5px] border-error/40 rounded-[10px] text-error text-sm font-semibold cursor-pointer"
                        >
                          Cancelar consulta
                        </button>
                      )}

                      {canCancel && confirmCancel && (
                        <div className="bg-error-wash border border-error/30 rounded-[10px] p-3.5">
                          <p className="text-[13px] text-error font-semibold mb-3">
                            Confirma o cancelamento?{data?.creditoDebitado > 0
                              ? ` Você receberá R$ ${Number(data.creditoDebitado).toFixed(2).replace('.', ',')} de volta na sua carteira.`
                              : ' A consulta será cancelada.'}
                          </p>
                          {cancelError && (
                            <p className="text-xs text-error mb-2.5">{cancelError}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setConfirmCancel(false); setCancelError(''); }}
                              className="flex-1 py-2.5 bg-canvas border border-line rounded-lg text-[13px] text-ink cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              onClick={handleCancelar}
                              disabled={cancelling}
                              className="flex-1 py-2.5 bg-error text-error-contrast border-none rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                    <div className="bg-success-wash border border-success/30 rounded-[10px] px-3.5 py-3">
                      <p className="text-[11px] font-bold text-success mb-1.5 uppercase tracking-wide">
                        Orientações do farmacêutico
                      </p>
                      <p className="text-sm text-success leading-relaxed m-0">{data.observacoes}</p>
                    </div>
                  )}

                  {data.motivo && (
                    <div className="bg-surface rounded-[10px] px-3.5 py-3">
                      <p className="text-[11px] font-bold text-muted mb-1 uppercase tracking-wide">
                        Motivo da consulta
                      </p>
                      <p className="text-sm text-ink m-0">{data.motivo}</p>
                    </div>
                  )}

                  {Array.isArray(data.receita) && data.receita.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-muted mb-2 uppercase tracking-wide">
                        Receita
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {data.receita.map((item, i) => (
                          <div key={i} className="bg-surface rounded-lg px-3 py-2 text-[13px] text-ink">
                            <span className="font-semibold">{item.medicamento}</span>
                            {item.dosagem && <span className="text-muted"> — {item.dosagem}</span>}
                            {item.instrucoes && (
                              <p className="mt-0.5 mb-0 text-muted text-xs">{item.instrucoes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão Ver receita (inline viewer) */}
                  {hasReceita && (
                    <button
                      onClick={() => setShowReceita(true)}
                      className="py-2.5 bg-brand text-brand-contrast border-none rounded-[10px] text-sm font-bold cursor-pointer"
                    >
                      📄 Ver receita
                    </button>
                  )}

                  {/* Botão Baixar PDF separado (quando PDF está gerado) */}
                  {data.receitaPdfUrl && (
                    <button
                      onClick={handleDownloadPdf}
                      disabled={downloading}
                      className="py-2.5 bg-canvas text-brand border-[1.5px] border-brand/40 rounded-[10px] text-sm font-bold cursor-pointer disabled:opacity-70"
                      style={{ cursor: downloading ? 'wait' : 'pointer' }}
                    >
                      {downloading ? 'Baixando...' : '⬇ Baixar PDF'}
                    </button>
                  )}

                  {/* Anexo da receita enviado na triagem (interpretação de receita) */}
                  {data.anexoReceitaUrl && (
                    <button
                      onClick={async () => {
                        try { await abrirDocumentoAutenticado(`${API_URL}${data.anexoReceitaUrl}`, token); }
                        catch { /* falha silenciosa — usuário pode tentar novamente */ }
                      }}
                      className="py-2.5 bg-canvas text-brand border-[1.5px] border-brand/40 rounded-[10px] text-sm font-bold cursor-pointer"
                    >
                      📎 Ver anexo enviado
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
                      className="py-2.5 bg-canvas border-[1.5px] border-brand rounded-[10px] text-brand text-sm font-bold cursor-pointer"
                    >
                      📅 Agendar nova consulta
                    </button>
                  )}
                </>
              )}

              {/* ── CANCELADA / EXPIRADA ───────────────────────── */}
              {isCancelled && (
                <div className="bg-error-wash border border-error/30 rounded-[10px] px-3.5 py-3 flex flex-col gap-1.5">
                  {data.creditoDebitado > 0 && (
                    <p className="text-sm text-error m-0 font-semibold">
                      {fmtMoney(data.creditoDebitado)} devolvidos ao seu saldo.
                    </p>
                  )}
                  {data.motivoCancelamento && (
                    <p className="text-[13px] text-error m-0">
                      Motivo: {data.motivoCancelamento}
                    </p>
                  )}
                  {!data.motivoCancelamento && !data.creditoDebitado && (
                    <p className="text-sm text-error m-0">Consulta cancelada.</p>
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
