import React, { useState, useCallback, useEffect } from 'react';
import { CalendarCheck2, CalendarX2 } from 'lucide-react';
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

  const SistemaIcon = sistemaAberto ? CalendarCheck2 : CalendarX2;

  return (
    <div className="space-y-4">
      {metricas ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value={metricas.usuarios_ativos?.pacientes}     label="Pacientes"             color="text-brand" />
          <StatCard value={metricas.usuarios_ativos?.farmaceuticos} label="Farmacêuticos ativos"  color="text-teal-600" />
          <StatCard value={metricas.consultas_realizadas}           label="Consultas realizadas"  color="text-success" />
          <StatCard value={metricas.consultas_agendadas}            label="Agendadas"             color="text-brand" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-canvas border border-line rounded-xl p-5 animate-pulse">
              <div className="h-8 bg-surface rounded w-16 mb-2" />
              <div className="h-4 bg-surface rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Estado operacional — Correção 7: handler/endpoint intocados */}
      <div className={`border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
        sistemaAberto ? 'bg-success-wash border-success/30' : sistemaAberto === false ? 'bg-error-wash border-error/30' : 'bg-canvas border-line'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold shrink-0 ${
            sistemaAberto ? 'bg-success text-white' : sistemaAberto === false ? 'bg-error text-white' : 'bg-line text-muted'
          }`}>
            {sistemaAberto !== null && <SistemaIcon className="w-4 h-4" strokeWidth={2} />}
            {togglingSistema ? 'Atualizando...' : sistemaAberto === null ? 'Carregando' : sistemaAberto ? 'Aberto' : 'Fechado'}
          </span>
          <div>
            <p className="font-semibold text-ink text-sm">Sistema de Agendamentos</p>
            <p className="text-xs text-muted mt-0.5">
              {sistemaAberto === null
                ? 'Carregando status...'
                : sistemaAberto
                  ? 'Pacientes podem realizar agendamentos.'
                  : 'Agendamentos estão suspensos para todos os pacientes.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleSistema}
          disabled={sistemaAberto === null || togglingSistema}
          aria-label={sistemaAberto ? 'Fechar sistema de agendamentos' : 'Abrir sistema de agendamentos'}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
            sistemaAberto ? 'bg-success' : 'bg-line'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-canvas shadow transition-transform duration-200 ${
              sistemaAberto ? 'translate-x-8' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <OperacionalCard api={api} />

      {metricas && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard value={metricas.consultas_canceladas}    label="Canceladas"               color="text-error" />
          <StatCard
            value={metricas.farmaceuticos_pendentes}
            label="Aguardando aprovação"
            color={metricas.farmaceuticos_pendentes > 0 ? 'text-alert' : 'text-muted'}
            sub={metricas.farmaceuticos_pendentes > 0 ? 'Vá em Farmacêuticos para aprovar' : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
