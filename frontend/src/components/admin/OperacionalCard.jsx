import React, { useState, useCallback, useEffect } from 'react';
import { Activity } from 'lucide-react';

// ── Dashboard operacional em tempo real ──────────────────────────────────────

const OperacionalCard = ({ api }) => {
  const [data, setData] = useState(null);

  const fetchTempoReal = useCallback(async () => {
    try {
      const res = await api('/api/admin/fila/tempo-real');
      if (res.ok) setData(await res.json());
    } catch (_) {}
  }, [api]);

  useEffect(() => {
    fetchTempoReal();
    const id = setInterval(fetchTempoReal, 30000);
    return () => clearInterval(id);
  }, [fetchTempoReal]);

  if (!data) {
    return (
      <div className="bg-canvas border border-line rounded-xl p-5">
        <div className="h-16 animate-pulse bg-surface rounded-lg" />
      </div>
    );
  }

  const alerta = data.urgentes_aguardando > 0 && data.espera_mais_antiga_min >= 10;
  const atencao = data.urgentes_aguardando > 0 && !alerta;

  const cardCls = alerta
    ? 'bg-error-wash border-error/30'
    : atencao
      ? 'bg-alert-wash border-alert/30'
      : 'bg-canvas border-line';

  const Item = ({ value, label, color = 'text-ink' }) => (
    <div>
      <p className={`text-2xl font-heading font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className={`border rounded-xl p-5 transition-colors ${cardCls}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-ink text-sm inline-flex items-center gap-1.5">
          <Activity className="w-4 h-4" strokeWidth={1.75} />
          Operação em tempo real
        </p>
        <span className="text-xs text-muted">↻ 30s</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <Item
          value={data.urgentes_aguardando}
          label="Urgentes aguardando"
          color={alerta ? 'text-error' : atencao ? 'text-alert' : 'text-ink'}
        />
        <Item
          value={data.urgentes_aguardando > 0 ? `${data.espera_mais_antiga_min}min` : '—'}
          label="Espera mais antiga"
          color={alerta ? 'text-error' : 'text-ink'}
        />
        <Item value={data.agendadas_aguardando_24h} label="Agendadas (24h)" />
        <Item value={data.em_atendimento_agora} label="Em atendimento" color="text-success" />
        <Item value={data.farmaceuticos_online} label="Farmacêuticos online" color="text-brand" />
        <Item value={data.disponiveis_urgencia} label="Disponíveis p/ urgência" color="text-teal-600" />
        <Item value={data.expiradas_hoje} label="Expiradas hoje" color={data.expiradas_hoje > 0 ? 'text-alert' : 'text-ink'} />
      </div>
      <div className="flex gap-6 mt-4 pt-4 border-t border-line text-xs text-muted">
        <span>Tempo médio de aceite (7d) — urgente: <strong className="text-ink">{data.tempo_medio_aceite_7d_min.urgente != null ? `${data.tempo_medio_aceite_7d_min.urgente}min` : '—'}</strong></span>
        <span>agendada: <strong className="text-ink">{data.tempo_medio_aceite_7d_min.agendada != null ? `${data.tempo_medio_aceite_7d_min.agendada}min` : '—'}</strong></span>
      </div>
    </div>
  );
};

export default OperacionalCard;
