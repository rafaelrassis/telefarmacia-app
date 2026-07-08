import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fmtEntrou, timeSince } from '../../utils/pharmacistFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Painel: Urgentes Aceitas (polling 30s) ────────────────────────────────────

const UrgentesAceitasPanel = ({ onCardClick, refreshTrigger }) => {
  const { token } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);
  const timerRef              = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/urgentes-aceitas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load, refreshTrigger]);

  // Atualiza elapsed a cada 30s sem refetch
  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  const STATUS_CFG = {
    aceito:         { label: 'Aceito',          bg: '#dbeafe', color: '#1d4ed8' },
    em_atendimento: { label: 'Em atendimento',  bg: '#dcfce7', color: '#15803d', pulse: true },
  };

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #e5e7eb',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      minHeight: '200px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontWeight: '700', fontSize: '15px', color: '#111827', margin: 0 }}>
          ⚡ Urgentes Aceitas
        </h2>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>↻ 30s</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
            Nenhuma urgência aceita
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '480px' }}>
          {items.map((item) => {
            const cfg = STATUS_CFG[item.status] ?? { label: item.status, bg: '#f3f4f6', color: '#374151' };
            return (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#fafafa',
                }}
              >
                {/* Nome + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <p style={{ fontWeight: '600', fontSize: '14px', color: '#111827', margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {item.pacienteNome}
                  </p>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    background: cfg.bg,
                    color: cfg.color,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {cfg.label}
                    {cfg.pulse && ' •'}
                  </span>
                </div>

                {/* Horário + elapsed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    Entrou: {fmtEntrou(item.criadoEm)}
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                    {timeSince(item.criadoEm)}
                  </p>
                </div>

                {/* Botão */}
                <button
                  onClick={() => onCardClick?.({ id: item.id, tipo: 'urgente' })}
                  style={{
                    width: '100%',
                    background: '#3B9FE0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Abrir atendimento
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UrgentesAceitasPanel;
