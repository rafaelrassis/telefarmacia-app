import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const toLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inp = { width: '100%', border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' };

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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}
      >
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ fontWeight: 700, color: '#111827', fontSize: 18, margin: 0 }}>Remarcar consulta</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, width: 32, height: 32, borderRadius: '50%' }}>×</button>
          </div>
          {remarcacoesRestantes != null && (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>
              {remarcacoesRestantes > 0
                ? `${remarcacoesRestantes} remarcação${remarcacoesRestantes !== 1 ? 'ões' : ''} restante${remarcacoesRestantes !== 1 ? 's' : ''}.`
                : 'Este é o limite de remarcações para esta consulta.'}
            </p>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Nova data</label>
            <input type="date" value={selectedDate} min={today} onChange={(e) => setSelectedDate(e.target.value)}
              style={{ ...inp, borderRadius: 12, padding: '10px 12px' }} />
          </div>
          <label style={lbl}>Novo horário</label>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 260, padding: '0 24px 8px' }}>
          {loadingSlots ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div style={{ width: 20, height: 20, border: '2px solid #3B9FE0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : slots.length === 0 ? (
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '20px 0', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Sem horários disponíveis nesta data.</p>
              <p style={{ color: '#d1d5db', fontSize: 12, margin: '4px 0 0' }}>Tente outra data.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {slots.map((hora) => (
                <button key={hora} onClick={() => setSelectedSlot(hora)} style={selectedSlot === hora ? {
                  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12,
                  padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                } : {
                  background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 12,
                  padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>{hora}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', padding: 16, background: 'white' }}>
          {error && (
            <p style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={!selectedSlot || saving}
              style={{
                flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700, color: 'white',
                background: !selectedSlot || saving ? '#a5b4fc' : '#4f46e5', border: 'none',
                borderRadius: 12, cursor: !selectedSlot || saving ? 'not-allowed' : 'pointer',
              }}
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
