import React, { useState, useCallback, useEffect } from 'react';
import StatCard from './StatCard';
import OperacionalCard from './OperacionalCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const OverviewTab = ({ api, showToast }) => {
  const [metricas, setMetricas]       = useState(null);
  const [sistemaAberto, setSistemaAberto] = useState(null);
  const [togglingSistema, setTogglingSistema] = useState(false);

  const load = useCallback(async () => {
    const [mRes, sRes] = await Promise.all([
      api('/api/admin/metricas'),
      fetch(`${API_URL}/api/sistema/status`),
    ]);
    if (mRes.ok) setMetricas(await mRes.json());
    if (sRes.ok) { const sd = await sRes.json(); setSistemaAberto(sd.sistema_aberto); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleToggleSistema = async () => {
    setTogglingSistema(true);
    try {
      const res  = await api('/api/admin/sistema', {
        method: 'PATCH', body: JSON.stringify({ aberto: !sistemaAberto }),
      });
      const data = await res.json();
      if (res.ok) {
        setSistemaAberto(data.sistema_aberto);
        showToast('success', data.sistema_aberto ? 'Sistema aberto para agendamentos.' : 'Sistema fechado.');
      } else {
        showToast('error', data.error || 'Erro ao alterar status do sistema.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setTogglingSistema(false); }
  };

  return (
    <div className="space-y-4">
      <OperacionalCard api={api} />

      {/* Sistema de agendamentos */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-800 text-sm">Sistema de Agendamentos</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {sistemaAberto === null
              ? 'Carregando status...'
              : sistemaAberto
                ? 'Aberto — pacientes podem realizar agendamentos.'
                : 'Fechado — agendamentos estão suspensos para todos os pacientes.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-bold ${sistemaAberto ? 'text-emerald-600' : 'text-red-500'}`}>
            {togglingSistema ? '...' : sistemaAberto ? 'Aberto' : 'Fechado'}
          </span>
          <button
            onClick={handleToggleSistema}
            disabled={sistemaAberto === null || togglingSistema}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              sistemaAberto ? 'bg-emerald-500' : 'bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                sistemaAberto ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {metricas ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value={metricas.usuarios_ativos?.pacientes}     label="Pacientes"             color="text-blue-600" />
            <StatCard value={metricas.usuarios_ativos?.farmaceuticos} label="Farmacêuticos ativos"  color="text-violet-600" />
            <StatCard value={metricas.consultas_realizadas}           label="Consultas realizadas"  color="text-green-600" />
            <StatCard value={metricas.consultas_agendadas}            label="Agendadas"             color="text-blue-500" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard value={metricas.consultas_canceladas}    label="Canceladas"               color="text-red-500" />
            <StatCard
              value={metricas.farmaceuticos_pendentes}
              label="Aguardando aprovação"
              color={metricas.farmaceuticos_pendentes > 0 ? 'text-amber-600' : 'text-gray-400'}
              sub={metricas.farmaceuticos_pendentes > 0 ? 'Vá em Farmacêuticos para aprovar' : undefined}
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
              <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
