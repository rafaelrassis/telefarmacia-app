import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { brDateKey, fmtEmMinOuHora } from '../../utils/pharmacistFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Card "Resumo do dia" ──────────────────────────────────────────────────────

const ResumoDoDia = ({ token, refreshTrigger }) => {
  const [resumo, setResumo] = useState(null);

  const load = useCallback(async () => {
    try {
      const [calRes, urgRes] = await Promise.all([
        fetch(`${API_URL}/api/farmaceutico/calendario`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/fila/urgentes?status=aguardando`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const calendario = calRes.ok ? await calRes.json() : [];
      const urgentes    = urgRes.ok ? await urgRes.json() : [];

      const hojeKey = brDateKey(new Date());
      const hojeAgendadas = calendario
        .filter((f) => f.tipo === 'agendada' && brDateKey(f.data_hora) === hojeKey)
        .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

      const proxima = hojeAgendadas.find((f) => new Date(f.data_hora).getTime() >= Date.now() - 15 * 60000);

      setResumo({
        totalHoje: hojeAgendadas.length,
        proximaHorario: proxima ? proxima.data_hora : null,
        urgentesAguardando: urgentes.length,
      });
    } catch { /* silencioso — card não crítico */ }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load, refreshTrigger]);

  if (!resumo) return null;

  const alerta = resumo.urgentesAguardando > 0;

  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 border rounded-xl px-4 py-3 mb-4 ${
      alerta ? 'bg-error-wash border-error/30' : 'bg-canvas border-line'
    }`}>
      <div>
        <p className="text-xs text-muted">Consultas de hoje</p>
        <p className="font-heading text-sm font-semibold text-ink">
          {resumo.totalHoje} {resumo.totalHoje === 1 ? 'aceita' : 'aceitas'}
          {resumo.proximaHorario && (
            <span className="text-muted font-normal"> · próxima {fmtEmMinOuHora(resumo.proximaHorario)}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <div>
          <p className="text-xs text-muted">Urgentes aguardando</p>
          <p className={`font-heading text-sm font-bold ${alerta ? 'text-error' : 'text-ink'}`}>
            {resumo.urgentesAguardando}
          </p>
        </div>
        {alerta && <AlertCircle className="w-4 h-4 text-error" strokeWidth={2} />}
      </div>
    </div>
  );
};

export default ResumoDoDia;
