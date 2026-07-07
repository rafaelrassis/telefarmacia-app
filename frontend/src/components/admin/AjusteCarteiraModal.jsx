import React, { useState } from 'react';

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
        showToast?.('success', '✅ Saldo ajustado!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-900 mb-1">Ajustar saldo</h3>
        <p className="text-xs text-gray-500 mb-4">{paciente.name} — {paciente.email}</p>
        <p className="text-xs text-gray-500 mb-4">
          Saldo atual: <strong className="text-gray-700">R$ {(paciente.saldo ?? 0).toFixed(2)}</strong>
        </p>

        <label className="text-xs text-gray-500 font-medium">Valor (use negativo para remover)</label>
        <input
          type="number" step="0.01" value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex.: 20 ou -20"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 mb-3 focus:ring-2 focus:ring-violet-400 outline-none"
        />

        <label className="text-xs text-gray-500 font-medium">Motivo</label>
        <textarea
          value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
          placeholder="Ex.: Compensação por erro no atendimento"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 mb-3 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
        />

        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-60 transition">
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AjusteCarteiraModal;
