import React, { useState } from 'react';
import Modal from '../ui/Modal';

// ── Modal: ajuste manual de saldo (carteira) de um paciente ─────────────────

const AjusteCarteiraModal = ({ api, paciente, onClose, onSuccess, showToast }) => {
  const [valor, setValor]   = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const handleSubmit = async () => {
    setErr('');
    const num = parseFloat(valor);
    if (isNaN(num) || num === 0) { setErr('Informe um valor diferente de zero.'); return; }
    if (motivo.trim().length < 3) { setErr('Informe um motivo (mín. 3 caracteres).'); return; }
    setSaving(true);
    try {
      const res = await api(`/api/admin/carteira/${paciente.id}/ajuste`, {
        method: 'POST',
        body: JSON.stringify({ valor: num, motivo: motivo.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast?.('success', 'Saldo ajustado!');
        onSuccess?.(paciente.id, d.saldo);
        onClose();
      } else {
        setErr(d.error || 'Erro ao ajustar saldo.');
      }
    } catch {
      setErr('Falha de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Ajustar saldo"
      onClose={onClose}
      maxWidth="max-w-sm"
      footer={(
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-line rounded-xl hover:bg-surface transition text-ink">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-brand text-brand-contrast rounded-xl hover:bg-brand-deep disabled:opacity-60 transition">
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      )}
    >
      <div className="px-6 pt-4 pb-2">
        <p className="text-xs text-muted mb-4">{paciente.name} — {paciente.email}</p>
        <p className="text-xs text-muted mb-4">
          Saldo atual: <strong className="text-ink">R$ {(paciente.saldo ?? 0).toFixed(2)}</strong>
        </p>

        <label htmlFor="ajuste-carteira-valor" className="text-xs text-muted font-medium">Valor (use negativo para remover)</label>
        <input
          id="ajuste-carteira-valor"
          type="number" step="0.01" value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex.: 20 ou -20"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink mt-1 mb-3 focus:ring-2 focus:ring-brand outline-none"
        />

        <label htmlFor="ajuste-carteira-motivo" className="text-xs text-muted font-medium">Motivo</label>
        <textarea
          id="ajuste-carteira-motivo"
          value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
          placeholder="Ex.: Compensação por erro no atendimento"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm text-ink mt-1 mb-3 focus:ring-2 focus:ring-brand outline-none resize-none"
        />

        {err && <p role="alert" className="text-xs text-error mb-1">{err}</p>}
      </div>
    </Modal>
  );
};

export default AjusteCarteiraModal;
