import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Pencil, Trash2, BellOff, X, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isPushSupported } from '../../utils/push';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MAX_HORARIOS = 6;
const EMPTY_FORM = { medicamento: '', dose: '', horarios: ['08:00'], dependentId: '' };

const Toggle = ({ checked, onChange, disabled, label }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
      checked ? 'bg-brand' : 'bg-line'
    }`}
    role="switch"
    aria-checked={checked}
    aria-label={label}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-canvas shadow ring-0 transition duration-200 ${
      checked ? 'translate-x-4' : 'translate-x-0'
    }`} />
  </button>
);

const LembretesMedicacao = ({ dependentes = [], pushEnabled, togglingPush, togglePush }) => {
  const { token } = useAuth();

  const [open, setOpen]           = useState(false);
  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [form, setForm]           = useState(null);   // null | { ...EMPTY_FORM, id? }
  const [formError, setFormError] = useState('');
  const [saving, setSaving]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // lembrete.id
  const [busyId, setBusyId]       = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchLembretes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/paciente/lembretes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setLembretes(await res.json());
      setError('');
    } catch {
      setError('Não foi possível carregar seus lembretes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLembretes(); }, [fetchLembretes]);

  const ativos = lembretes.filter((l) => l.ativo).length;

  const closeModal = () => {
    setOpen(false);
    setForm(null);
    setFormError('');
    setConfirmDelete(null);
  };

  // ── Ações ──────────────────────────────────────────────────────────────────

  const salvarForm = async () => {
    setFormError('');
    if (!form.medicamento.trim()) { setFormError('Informe o nome do medicamento.'); return; }
    if (form.horarios.length === 0) { setFormError('Adicione ao menos um horário.'); return; }
    if (form.horarios.some((h) => !h)) { setFormError('Preencha todos os horários.'); return; }

    setSaving(true);
    try {
      const body = JSON.stringify({
        medicamento: form.medicamento.trim(),
        dose:        form.dose.trim() || null,
        horarios:    [...new Set(form.horarios)],
        dependentId: form.dependentId || null,
      });
      const res = form.id
        ? await fetch(`${API_URL}/api/paciente/lembretes/${form.id}`, { method: 'PATCH', headers: authHeaders, body })
        : await fetch(`${API_URL}/api/paciente/lembretes`,            { method: 'POST',  headers: authHeaders, body });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erro ao salvar lembrete.');
        return;
      }
      setForm(null);
      await fetchLembretes();
    } catch {
      setFormError('Falha de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (l) => {
    setBusyId(l.id);
    try {
      const res = await fetch(`${API_URL}/api/paciente/lembretes/${l.id}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ ativo: !l.ativo }),
      });
      if (res.ok) await fetchLembretes();
    } catch {} finally {
      setBusyId(null);
    }
  };

  const excluir = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/paciente/lembretes/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmDelete(null);
        await fetchLembretes();
      }
    } catch {} finally {
      setBusyId(null);
    }
  };

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setHorario = (idx, valor) => {
    setForm((f) => ({ ...f, horarios: f.horarios.map((h, i) => (i === idx ? valor : h)) }));
  };
  const addHorario = () => {
    setForm((f) => (f.horarios.length >= MAX_HORARIOS ? f : { ...f, horarios: [...f.horarios, ''] }));
  };
  const removeHorario = (idx) => {
    setForm((f) => ({ ...f, horarios: f.horarios.filter((_, i) => i !== idx) }));
  };

  const abrirEdicao = (l) => {
    setFormError('');
    setForm({
      id:          l.id,
      medicamento: l.medicamento,
      dose:        l.dose || '',
      horarios:    l.horarios,
      dependentId: l.dependentId || '',
    });
  };

  const dependentesAtivos = dependentes.filter((d) => d.ativo !== false);
  const mostrarAvisoPush  = isPushSupported() && !pushEnabled;

  return (
    <>
      {/* Card de entrada */}
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-canvas border border-line rounded-xl p-4 flex items-center gap-3 text-left hover:border-brand/50 transition-colors"
      >
        <div className="w-10 h-10 bg-brand-wash rounded-xl flex items-center justify-center shrink-0">
          <Pill className="w-5 h-5 text-brand" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Lembretes de medicação</p>
          <p className="text-xs text-muted mt-0.5">
            {ativos === 0
              ? 'Nenhum lembrete'
              : `${ativos} lembrete${ativos > 1 ? 's' : ''} ativo${ativos > 1 ? 's' : ''}`}
          </p>
        </div>
        <span className="text-muted shrink-0">›</span>
      </button>

      {/* Gerenciador (bottom-sheet / modal) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          <div
            className="relative bg-canvas w-full sm:rounded-2xl shadow-2xl sm:max-w-lg flex flex-col"
            style={{ maxHeight: '92vh', borderRadius: '16px 16px 0 0' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 shrink-0">
              <h2 className="text-base font-bold text-ink m-0 flex items-center gap-2">
                <Pill className="w-4 h-4 text-brand" strokeWidth={2.25} />
                Lembretes de medicação
              </h2>
              <button
                onClick={closeModal}
                className="text-muted hover:text-ink p-1"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-7 pt-3 space-y-3">
              {/* Aviso de push desativado */}
              {mostrarAvisoPush && (
                <div className="flex items-center justify-between gap-3 bg-alert-wash border border-alert/30 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <BellOff className="w-4 h-4 text-alert shrink-0" strokeWidth={2} />
                    <p className="text-xs text-alert">Ative as notificações para receber os lembretes.</p>
                  </div>
                  <button
                    onClick={togglePush}
                    disabled={togglingPush}
                    className="shrink-0 text-xs font-bold text-alert underline underline-offset-2 disabled:opacity-50"
                  >
                    Ativar
                  </button>
                </div>
              )}

              {loading && (
                <p className="text-sm text-muted text-center py-10">Carregando...</p>
              )}

              {!loading && error && (
                <p className="text-sm text-error text-center py-10">{error}</p>
              )}

              {/* Formulário de criação/edição */}
              {!loading && !error && form && (
                <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-ink m-0">
                    {form.id ? 'Editar lembrete' : 'Novo lembrete'}
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Medicamento *</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={form.medicamento}
                      onChange={(e) => setForm((f) => ({ ...f, medicamento: e.target.value }))}
                      placeholder="Ex.: Losartana 50mg"
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">Dose (opcional)</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={form.dose}
                      onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                      placeholder="Ex.: 1 comprimido"
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">
                      Horários ({form.horarios.length}/{MAX_HORARIOS})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {form.horarios.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-canvas border border-line rounded-lg px-2 py-1">
                          <input
                            type="time"
                            step={300}
                            value={h}
                            onChange={(e) => setHorario(idx, e.target.value)}
                            className="bg-transparent text-sm text-ink outline-none"
                          />
                          {form.horarios.length > 1 && (
                            <button
                              onClick={() => removeHorario(idx)}
                              className="text-muted hover:text-error"
                              aria-label="Remover horário"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {form.horarios.length < MAX_HORARIOS && (
                        <button
                          onClick={addHorario}
                          className="flex items-center gap-1 text-xs font-semibold text-brand-deep border border-dashed border-line rounded-lg px-2.5 py-1.5 hover:border-brand/50"
                        >
                          <Plus className="w-3.5 h-3.5" /> Horário
                        </button>
                      )}
                    </div>
                  </div>

                  {dependentesAtivos.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">Para quem?</label>
                      <select
                        value={form.dependentId}
                        onChange={(e) => setForm((f) => ({ ...f, dependentId: e.target.value }))}
                        className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="">Para mim (titular)</option>
                        {dependentesAtivos.map((d) => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formError && <p className="text-xs text-error m-0">{formError}</p>}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={salvarForm}
                      disabled={saving}
                      className="flex-1 bg-brand hover:bg-brand-deep text-white text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => { setForm(null); setFormError(''); }}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-semibold text-muted hover:text-ink"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Botão novo lembrete */}
              {!loading && !error && !form && (
                <button
                  onClick={() => { setFormError(''); setForm({ ...EMPTY_FORM }); }}
                  className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-deep text-white text-sm font-bold px-4 py-2.5 rounded-xl transition"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} /> Novo lembrete
                </button>
              )}

              {/* Estado vazio */}
              {!loading && !error && !form && lembretes.length === 0 && (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-brand-wash rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Pill className="w-6 h-6 text-brand" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-semibold text-ink mb-1">Nunca mais esqueça um medicamento</p>
                  <p className="text-xs text-muted leading-relaxed">
                    Cadastre seus medicamentos com os horários de uso e receba uma notificação
                    na hora certa — para você ou para seus dependentes.
                  </p>
                </div>
              )}

              {/* Lista */}
              {!loading && !error && lembretes.map((l) => (
                <div
                  key={l.id}
                  className={`bg-surface border border-line rounded-xl p-3.5 space-y-2 ${l.ativo ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink m-0 truncate">
                        {l.medicamento}
                        {l.dose && <span className="font-normal text-muted"> — {l.dose}</span>}
                      </p>
                      {l.dependent?.nome && (
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand-deep">
                          {l.dependent.nome.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <Toggle
                      checked={l.ativo}
                      onChange={() => toggleAtivo(l)}
                      disabled={busyId === l.id}
                      label={l.ativo ? 'Pausar lembrete' : 'Retomar lembrete'}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {l.horarios.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-deep bg-canvas border border-line rounded-full px-2 py-0.5"
                      >
                        <Clock className="w-3 h-3" strokeWidth={2} /> {h}
                      </span>
                    ))}
                    <span className="flex-1" />
                    <button
                      onClick={() => abrirEdicao(l)}
                      className="text-muted hover:text-brand-deep p-1"
                      aria-label="Editar lembrete"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {confirmDelete === l.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          onClick={() => excluir(l.id)}
                          disabled={busyId === l.id}
                          className="text-[11px] font-bold text-error disabled:opacity-50"
                        >
                          Excluir?
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-[11px] font-semibold text-muted"
                        >
                          Não
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(l.id)}
                        className="text-muted hover:text-error p-1"
                        aria-label="Excluir lembrete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LembretesMedicacao;
