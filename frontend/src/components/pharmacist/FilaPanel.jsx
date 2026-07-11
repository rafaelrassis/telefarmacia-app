import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePharmacistToast } from '../../hooks/usePharmacistToast';
import { fmtDateTime, timeUntil } from '../../utils/pharmacistFormat';
import EmptyState from '../ui/EmptyState';
import ToastBanner from './ToastBanner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Fila de agendamentos (polling 30s) — menor criticidade da fila ───────────

const FilaPanel = ({ onAccepted, onCardClick, hasEmAtendimento }) => {
  const { token } = useAuth();
  const [fila, setFila]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [accepting, setAccepting] = useState({});
  const [toast, showToast]      = usePharmacistToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fila/agendadas?status=aguardando`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFila(await res.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const aceitar = async (id, nomePaciente) => {
    setAccepting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/fila/agendadas/${id}/aceitar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFila((p) => p.filter((f) => f.id !== id));
        showToast('success', `Consulta aceita! Paciente: ${data.fila?.paciente?.name ?? nomePaciente}`);
        onAccepted?.();
      } else if (res.status === 409) {
        showToast('error', 'Consulta aceita por outro farmacêutico.');
        load();
      } else {
        showToast('error', data.error || 'Erro ao aceitar.');
      }
    } catch {
      showToast('error', 'Falha de conexão.');
    }
    setAccepting((p) => ({ ...p, [id]: false }));
  };

  const sorted = [...fila].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  return (
    <div className="bg-canvas border border-line rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading flex items-center gap-1.5 font-bold text-ink text-base">
          <CalendarClock className="w-4 h-4 text-muted" strokeWidth={2} />
          Fila de agendamentos
        </h2>
        <span className="text-xs text-muted">↻ 30s</span>
      </div>

      <ToastBanner toast={toast} />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState title="Nenhuma consulta aguardando" />
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-80">
          {sorted.map((f) => (
            <div
              key={f.id}
              onClick={() => onCardClick?.({ id: f.id, tipo: 'agendada' })}
              className={`border border-line rounded-xl p-3.5 flex items-start justify-between gap-3 ${onCardClick ? 'cursor-pointer hover:bg-surface transition-colors' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink text-sm truncate">{f.paciente?.name}</p>
                <p className="text-xs text-brand-deep font-medium mt-0.5">{fmtDateTime(f.dataHora)}</p>
                <p className="text-xs text-muted mt-0.5">{timeUntil(f.dataHora)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); aceitar(f.id, f.paciente?.name); }}
                disabled={accepting[f.id] || hasEmAtendimento}
                title={hasEmAtendimento ? 'Finalize o atendimento atual primeiro' : undefined}
                className="shrink-0 bg-brand hover:bg-brand-deep disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                {accepting[f.id] ? '...' : 'Aceitar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilaPanel;
