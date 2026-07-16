import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlarmClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fmtEntrou, timeSince } from '../../utils/pharmacistFormat';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Urgentes aceitas por você (polling 30s) — segunda maior criticidade ──────
// aceitoEm existe no schema e é o que o cron usa para cancelar (ver
// cronJobs.js), mas o endpoint /farmaceutico/urgentes-aceitas não o expõe —
// por isso o tempo mostrado usa criadoEm, como já era feito antes desta fase.

const STATUS_CFG = {
  aceito:         { label: 'Aceita',          variant: 'info' },
  em_atendimento: { label: 'Em atendimento',  variant: 'success' },
};

const UrgentesAceitasPanel = ({ onCardClick, refreshTrigger }) => {
  const { token } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick]           = useState(0);
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

  return (
    <div className="bg-canvas border border-line rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading flex items-center gap-1.5 font-bold text-ink text-base">
          <AlarmClock className="w-4 h-4 text-muted" strokeWidth={2} />
          Aceitas por você
        </h2>
        <span className="text-xs text-muted">↻ 30s</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma urgência aceita" />
      ) : (
        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[480px]">
          {items.map((item) => {
            const cfg = STATUS_CFG[item.status] ?? { label: item.status, variant: 'neutral' };
            return (
              <div key={item.id} className="border border-line rounded-xl p-3 flex flex-col gap-2 bg-surface">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-ink truncate min-w-0 flex-1">{item.pacienteNome}</p>
                  <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                </div>

                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-muted">Entrou: {fmtEntrou(item.criadoEm)}</p>
                  <p className="text-xs font-semibold text-alert">
                    {timeSince(item.criadoEm)} — inicie o quanto antes
                  </p>
                </div>

                <button
                  onClick={() => onCardClick?.({ id: item.id, tipo: 'urgente' })}
                  className="w-full bg-brand hover:bg-brand-deep text-brand-contrast text-sm font-semibold rounded-lg py-2 transition"
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
