import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_LABELS = {
  aguardando:     { label: 'Aguardando farmacêutico', cls: 'text-gray-600 bg-gray-100' },
  aceito:         { label: 'Confirmado',              cls: 'text-blue-700 bg-blue-100' },
  em_atendimento: { label: 'Em atendimento',          cls: 'text-green-700 bg-green-100' },
  concluido:      { label: 'Concluído',               cls: 'text-violet-700 bg-violet-100' },
  cancelado:      { label: 'Cancelado',               cls: 'text-red-700 bg-red-100' },
};

const fmtElapsed = (s) => {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}h ` : ''}${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
};

const emptyMed = () => ({ medicamento: '', dosagem: '', posologia: '', duracao: '' });

const ConsultaModal = ({ id, tipo, onClose, onUpdated }) => {
  const { token, user } = useAuth();
  const [consulta, setConsulta]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [motivo, setMotivo]               = useState('');
  const [observacoes, setObservacoes]     = useState('');
  const [receita, setReceita]             = useState([]);
  const [receitaPdfUrl, setReceitaPdfUrl] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmCancel,      setConfirmCancel]      = useState(false);
  const [showDevolverConfirm, setShowDevolverConfirm] = useState(false);
  const [motivoDevolver,      setMotivoDevolver]      = useState('');
  const [showHistory, setShowHistory]     = useState(false);
  const [historico, setHistorico]         = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const timerRef = useRef(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/consulta/${id}?tipo=${tipo}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConsulta(data);
          setMotivo(data.motivo || '');
          setObservacoes(data.observacoes || '');
          setReceita(Array.isArray(data.receita) && data.receita.length > 0 ? data.receita : []);
          setReceitaPdfUrl(data.receitaPdfUrl ?? null);
        } else {
          setError('Erro ao carregar consulta.');
        }
      } catch { setError('Falha de conexão.'); }
      setLoading(false);
    };
    load();
  }, [id, tipo, token]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRef.current);
    if (consulta?.status === 'em_atendimento') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [consulta?.status]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Histórico ──────────────────────────────────────────────────────────────
  const loadHistory = async () => {
    if (!consulta?.pacienteId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/paciente/${consulta.pacienteId}/historico`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistorico(await res.json());
    } catch {}
    setLoadingHistory(false);
  };

  // ── Ações genéricas ────────────────────────────────────────────────────────
  const doAction = async (action, extra = {}) => {
    setError('');
    setActionLoading(action);
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/${action}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tipo, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      setError(data.error || `Erro ao ${action}.`);
      return null;
    } catch { setError('Falha de conexão.'); return null; }
    finally   { setActionLoading(null); }
  };

  const handleIniciar = async () => {
    const data = await doAction('iniciar');
    if (data) {
      setConsulta((p) => ({ ...p, status: 'em_atendimento' }));
      setElapsed(0);
      onUpdated?.();
    }
  };

  const handleConcluir = async () => {
    if (!observacoes.trim()) { setError('Preencha as observações antes de concluir.'); return; }
    const itensValidos = receita.filter((m) => m.medicamento?.trim());
    const data = await doAction('concluir', {
      observacoes: observacoes.trim(),
      motivo:      motivo.trim() || null,
      receita:     itensValidos,
    });
    if (data) {
      // Não fecha — fica aberto para o farmacêutico gerar o PDF
      setConsulta((p) => ({ ...p, status: 'concluido', receita: itensValidos }));
      setReceita(itensValidos);
      onUpdated?.();
    }
  };

  const handleCancelar = async () => {
    const data = await doAction('cancelar');
    if (data) { onUpdated?.(); onClose(); }
    setConfirmCancel(false);
  };

  const handleDevolver = async () => {
    const data = await doAction('devolver', { motivo: motivoDevolver.trim() || null });
    if (data) { onUpdated?.(); onClose(); }
    setShowDevolverConfirm(false);
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const handleGerarPdf = async () => {
    setError('');
    setActionLoading('pdf');
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/receita/pdf`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tipo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setReceitaPdfUrl(data.url);
        window.open(`${API_URL}${data.url}`, '_blank');
      } else {
        setError(data.error || 'Erro ao gerar PDF.');
      }
    } catch { setError('Falha ao gerar PDF.'); }
    finally   { setActionLoading(null); }
  };

  // ── Receita: manipulação da lista ──────────────────────────────────────────
  const addMed    = () => setReceita((p) => [...p, emptyMed()]);
  const removeMed = (i) => setReceita((p) => p.filter((_, idx) => idx !== i));
  const updateMed = (i, field, val) =>
    setReceita((p) => p.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));

  // ── Flags ──────────────────────────────────────────────────────────────────
  const isAssigned  = consulta?.farmaceuticoId === user?.id;
  const canIniciar  = isAssigned && consulta?.status === 'aceito';
  const canConcluir = isAssigned && consulta?.status === 'em_atendimento';
  const canCancelar = isAssigned && !['concluido', 'cancelado', 'expirado'].includes(consulta?.status ?? '');
  const canDevolver = isAssigned && ['aceito', 'em_atendimento'].includes(consulta?.status ?? '');
  const statusCfg   = STATUS_LABELS[consulta?.status] ?? { label: consulta?.status, cls: 'text-gray-500 bg-gray-100' };
  const tipoBadge   = tipo === 'urgente' ? '🔴 Urgente' : '📅 Agendada';
  const receitaEditable = isAssigned && ['aceito', 'em_atendimento'].includes(consulta?.status);
  const receitaReadonly = consulta?.status === 'concluido';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="font-bold text-gray-900 text-lg">Atendimento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error && !consulta ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : consulta ? (
          <div className="px-6 pb-6 pt-4 space-y-5">

            {/* ── Dados do atendimento (somente leitura) ── */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="font-bold text-gray-900 text-base">{consulta.pacienteNome}</p>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-600 shrink-0">
                  {tipoBadge}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {new Date(consulta.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
                {consulta.status === 'em_atendimento' && (
                  <span className="font-mono text-sm font-bold text-green-700">
                    ⏱ {fmtElapsed(elapsed)}
                  </span>
                )}
              </div>
            </div>

            {/* ── Botões de ação ── */}
            {(canIniciar || canConcluir || canCancelar || canDevolver) && !confirmCancel && !showDevolverConfirm && (
              <div className="flex gap-2 flex-wrap">
                {canIniciar && (
                  <button onClick={handleIniciar} disabled={!!actionLoading}
                    className="flex-1 px-4 py-2.5 bg-violet-700 text-white text-sm font-bold rounded-xl hover:bg-violet-800 disabled:opacity-50 transition">
                    {actionLoading === 'iniciar' ? '...' : '▶ Iniciar'}
                  </button>
                )}
                {canConcluir && (
                  <button onClick={handleConcluir} disabled={!!actionLoading}
                    className="flex-1 px-4 py-2.5 bg-green-700 text-white text-sm font-bold rounded-xl hover:bg-green-800 disabled:opacity-50 transition">
                    {actionLoading === 'concluir' ? '...' : '✅ Concluir'}
                  </button>
                )}
                {canDevolver && (
                  <button onClick={() => setShowDevolverConfirm(true)} disabled={!!actionLoading}
                    className="px-4 py-2.5 bg-white border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-50 disabled:opacity-50 transition">
                    ↩ Devolver para fila
                  </button>
                )}
                {canCancelar && (
                  <button onClick={() => setConfirmCancel(true)} disabled={!!actionLoading}
                    className="px-4 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-50 transition">
                    ❌ Cancelar
                  </button>
                )}
              </div>
            )}

            {/* ── Confirmação de cancelamento ── */}
            {confirmCancel && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-red-800">Confirmar cancelamento?</p>
                <p className="text-xs text-red-600">
                  R$ {Number(consulta.creditoDebitado || 50).toFixed(2).replace('.', ',')} será devolvido ao paciente.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmCancel(false)}
                    className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    Voltar
                  </button>
                  <button onClick={handleCancelar} disabled={actionLoading === 'cancelar'}
                    className="flex-1 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                    {actionLoading === 'cancelar' ? '...' : 'Sim, cancelar'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Confirmação de devolução ── */}
            {showDevolverConfirm && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800">Devolver esta consulta para a fila?</p>
                <p className="text-xs text-amber-600">Outro farmacêutico poderá atendê-la.</p>
                <textarea
                  value={motivoDevolver}
                  onChange={(e) => setMotivoDevolver(e.target.value)}
                  placeholder="Motivo da devolução (opcional)"
                  rows={2}
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDevolverConfirm(false); setMotivoDevolver(''); }}
                    className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    Voltar
                  </button>
                  <button onClick={handleDevolver} disabled={actionLoading === 'devolver'}
                    className="flex-1 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
                    {actionLoading === 'devolver' ? '...' : 'Sim, devolver'}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            {/* ── Motivo e Observações ── */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Motivo / Queixa principal
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo da consulta ou queixa do paciente..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-violet-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Observações do atendimento{canConcluir && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Orientações, recomendações ou observações clínicas..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-violet-400 outline-none"
                />
                {canConcluir && !observacoes.trim() && (
                  <p className="text-xs text-amber-600 mt-1">Obrigatório para concluir o atendimento.</p>
                )}
              </div>
            </div>

            {/* ── Receita Farmacêutica ── */}
            {(receitaEditable || receitaReadonly) && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">💊 Receita Farmacêutica</h3>

                {receitaEditable ? (
                  /* Modo edição */
                  <div className="space-y-2">
                    {receita.map((med, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Medicamento {i + 1}</span>
                          <button
                            onClick={() => removeMed(i)}
                            className="text-red-400 hover:text-red-600 text-lg leading-none w-6 h-6 flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Nome do medicamento"
                          value={med.medicamento}
                          onChange={(e) => updateMed(i, 'medicamento', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Dosagem (ex: 500mg)"
                            value={med.dosagem}
                            onChange={(e) => updateMed(i, 'dosagem', e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Duração (ex: 7 dias)"
                            value={med.duracao}
                            onChange={(e) => updateMed(i, 'duracao', e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Posologia (ex: 1 comprimido de 8 em 8 horas)"
                          value={med.posologia}
                          onChange={(e) => updateMed(i, 'posologia', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addMed}
                      className="w-full py-2.5 text-sm font-semibold text-violet-700 border-2 border-dashed border-violet-200 rounded-xl hover:bg-violet-50 transition"
                    >
                      + Adicionar medicamento
                    </button>
                  </div>
                ) : (
                  /* Modo leitura (concluído) */
                  <div className="space-y-3">
                    {receita.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nenhum medicamento prescrito.</p>
                    ) : (
                      <div className="space-y-2">
                        {receita.map((med, i) => (
                          <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-0.5">
                            <p className="font-semibold text-gray-800 text-sm">
                              {i + 1}. {med.medicamento}{med.dosagem ? `  ${med.dosagem}` : ''}
                            </p>
                            {med.posologia && <p className="text-gray-600">Posologia: {med.posologia}</p>}
                            {med.duracao && <p className="text-gray-600">Duração: {med.duracao}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botão PDF — apenas para o farmacêutico responsável */}
                    {isAssigned && (
                      <div className="flex gap-2 pt-1">
                        {receitaPdfUrl && (
                          <a
                            href={`${API_URL}${receitaPdfUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 px-4 py-2.5 text-center text-sm font-bold text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-50 transition"
                          >
                            📄 Ver PDF
                          </a>
                        )}
                        <button
                          onClick={handleGerarPdf}
                          disabled={actionLoading === 'pdf'}
                          className="flex-1 px-4 py-2.5 text-sm font-bold bg-violet-700 text-white rounded-xl hover:bg-violet-800 disabled:opacity-50 transition"
                        >
                          {actionLoading === 'pdf'
                            ? '⏳ Gerando...'
                            : receitaPdfUrl ? '↺ Re-gerar PDF' : '📄 Gerar PDF'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Histórico do paciente (colapsável) ── */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => {
                  const next = !showHistory;
                  setShowHistory(next);
                  if (next && historico.length === 0) loadHistory();
                }}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-violet-700 transition w-full text-left"
              >
                <span className="text-xs">{showHistory ? '▲' : '▼'}</span>
                Histórico do paciente
                {historico.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal ml-1">({historico.length} registros)</span>
                )}
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {loadingHistory ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : historico.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">Nenhum histórico encontrado.</p>
                  ) : (
                    historico.map((h) => (
                      <div key={h.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded font-semibold ${
                            h.tipo === 'urgente'  ? 'bg-red-100 text-red-700' :
                            h.tipo === 'agendada' ? 'bg-violet-100 text-violet-700' :
                                                    'bg-gray-200 text-gray-600'
                          }`}>
                            {h.tipo === 'urgente' ? 'Urgente' : h.tipo === 'agendada' ? 'Agendada' : 'Consulta'}
                          </span>
                          <span className="text-gray-400">
                            {new Date(h.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </span>
                          <span className={`font-medium ${String(h.status).toLowerCase().includes('cancel') ? 'text-red-500' : 'text-green-600'}`}>
                            {String(h.status).toLowerCase().includes('cancel') ? 'Cancelado' : 'Concluído'}
                          </span>
                        </div>
                        {h.motivo && <p className="text-gray-500 italic mb-1">Motivo: {h.motivo}</p>}
                        {h.observacoes ? (
                          <p className="text-gray-700 leading-snug">"{h.observacoes}"</p>
                        ) : (
                          !h.motivo && <p className="text-gray-400 italic">Sem observações registradas.</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ConsultaModal;
