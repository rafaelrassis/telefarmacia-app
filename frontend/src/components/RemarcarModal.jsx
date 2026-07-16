import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const toLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

const RemarcarModal = ({ consulta, onClose, onRemarcado }) => {
  const { token } = useAuth();
  const today = toLocalDateStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots]               = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  const remarcacoesRestantes = consulta.remarcacoes != null ? Math.max(0, 2 - consulta.remarcacoes) : null;

  useEffect(() => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError('');
    fetch(`${API_URL}/api/disponibilidade?data=${selectedDate}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const handleConfirmar = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    setError('');
    try {
      const nova_data_hora = `${selectedDate}T${selectedSlot}:00-03:00`;
      const res = await fetch(`${API_URL}/api/consulta/${consulta.id}/remarcar`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nova_data_hora }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao remarcar consulta.');
        return;
      }
      onRemarcado?.(data);
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-canvas border border-line rounded-2xl shadow-md w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-ink text-lg m-0">Remarcar consulta</h2>
            <button onClick={onClose} className="bg-transparent border-none text-[22px] cursor-pointer text-muted hover:text-ink leading-none w-8 h-8 rounded-full">×</button>
          </div>
          {remarcacoesRestantes != null && (
            <p className="text-xs text-muted mb-4">
              {remarcacoesRestantes > 0
                ? `${remarcacoesRestantes} remarcação${remarcacoesRestantes !== 1 ? 'ões' : ''} restante${remarcacoesRestantes !== 1 ? 's' : ''}.`
                : 'Este é o limite de remarcações para esta consulta.'}
            </p>
          )}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-ink mb-1.5">Nova data</label>
            <input type="date" value={selectedDate} min={today} onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full box-border border border-line rounded-xl px-3 py-2.5 text-sm text-ink bg-canvas" />
          </div>
          <label className="block text-[13px] font-semibold text-ink mb-1.5">Novo horário</label>
        </div>
        <div className="overflow-y-auto flex-1 max-h-[260px] px-6 pb-2">
          {loadingSlots ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-surface rounded-xl py-5 text-center">
              <p className="text-muted text-sm m-0">Sem horários disponíveis nesta data.</p>
              <p className="text-muted text-xs mt-1 mb-0">Tente outra data.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((hora) => (
                <button
                  key={hora}
                  onClick={() => setSelectedSlot(hora)}
                  className={`rounded-xl py-2.5 text-sm font-semibold cursor-pointer transition ${
                    selectedSlot === hora
                      ? 'bg-brand text-brand-contrast border-none'
                      : 'bg-canvas text-ink border border-line hover:border-brand/60'
                  }`}
                >
                  {hora}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-line p-4 bg-canvas">
          {error && (
            <p className="text-[13px] text-error bg-error-wash border border-error/30 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-muted bg-canvas border border-line rounded-xl cursor-pointer hover:bg-surface transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!selectedSlot || saving}
              className="flex-1 py-2.5 text-sm font-bold text-brand-contrast bg-brand hover:bg-brand-deep disabled:opacity-50 disabled:cursor-not-allowed border-none rounded-xl transition"
            >
              {saving ? 'Remarcando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemarcarModal;
