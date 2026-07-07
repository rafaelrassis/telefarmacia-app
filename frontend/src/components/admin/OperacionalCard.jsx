import React, { useState, useCallback, useEffect } from 'react';

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
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="h-16 animate-pulse bg-gray-50 rounded-lg" />
      </div>
    );
  }

  const alerta = data.urgentes_aguardando > 0 && data.espera_mais_antiga_min >= 10;
  const atencao = data.urgentes_aguardando > 0 && !alerta;

  const cardCls = alerta
    ? 'bg-red-50 border-red-200'
    : atencao
      ? 'bg-amber-50 border-amber-200'
      : 'bg-white border-gray-200';

  const Item = ({ value, label, color = 'text-gray-900' }) => (
    <div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className={`border rounded-xl p-5 transition-colors ${cardCls}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-800 text-sm">⚡ Operação em tempo real</p>
        <span className="text-xs text-gray-400">↻ 30s</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <Item
          value={data.urgentes_aguardando}
          label="Urgentes aguardando"
          color={alerta ? 'text-red-600' : atencao ? 'text-amber-600' : 'text-gray-900'}
        />
        <Item
          value={data.urgentes_aguardando > 0 ? `${data.espera_mais_antiga_min}min` : '—'}
          label="Espera mais antiga"
          color={alerta ? 'text-red-600' : 'text-gray-900'}
        />
        <Item value={data.agendadas_aguardando_24h} label="Agendadas (24h)" />
        <Item value={data.em_atendimento_agora} label="Em atendimento" color="text-green-600" />
        <Item value={data.farmaceuticos_online} label="Farmacêuticos online" color="text-blue-600" />
        <Item value={data.disponiveis_urgencia} label="Disponíveis p/ urgência" color="text-violet-600" />
        <Item value={data.expiradas_hoje} label="Expiradas hoje" color={data.expiradas_hoje > 0 ? 'text-amber-600' : 'text-gray-900'} />
      </div>
      <div className="flex gap-6 mt-4 pt-4 border-t border-black/5 text-xs text-gray-500">
        <span>Tempo médio de aceite (7d) — urgente: <strong className="text-gray-700">{data.tempo_medio_aceite_7d_min.urgente != null ? `${data.tempo_medio_aceite_7d_min.urgente}min` : '—'}</strong></span>
        <span>agendada: <strong className="text-gray-700">{data.tempo_medio_aceite_7d_min.agendada != null ? `${data.tempo_medio_aceite_7d_min.agendada}min` : '—'}</strong></span>
      </div>
    </div>
  );
};

export default OperacionalCard;
