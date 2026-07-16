import React, { useState, useCallback, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { DIAS_SEMANA, DEFAULT_HORARIOS } from '../../utils/adminFormat';

const HorariosTab = ({ api, showToast }) => {
  const [horarios, setHorarios] = useState(DEFAULT_HORARIOS);
  const [savingHorarios, setSavingHorarios] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  const load = useCallback(async () => {
    const hRes = await api('/api/admin/horarios');
    if (hRes.ok) {
      const h = await hRes.json();
      if (h.length > 0) {
        // Mescla com defaults para garantir os 7 dias
        setHorarios(DEFAULT_HORARIOS.map((def) => {
          const saved = h.find((x) => x.diaSemana === def.diaSemana);
          return saved ? { ...def, ...saved } : def;
        }));
      }
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const updateHorario = (diaSemana, field, value) => {
    setHorarios((prev) =>
      prev.map((h) => h.diaSemana === diaSemana ? { ...h, [field]: value } : h)
    );
  };

  const handleSaveHorarios = async () => {
    setSavingHorarios(true);
    try {
      const res  = await api('/api/admin/horarios', {
        method: 'PUT', body: JSON.stringify({ horarios }),
      });
      const data = await res.json();
      if (res.ok) {
        setUltimaAtualizacao(data.ultima_atualizacao ?? new Date().toISOString());
      } else {
        showToast('error', data.error || 'Erro ao salvar horários.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setSavingHorarios(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="font-semibold text-ink text-sm">Horários de funcionamento</p>
          <p className="text-xs text-muted mt-0.5">
            Define os dias e horários em que os pacientes podem agendar consultas.
          </p>
        </div>
        <div className="divide-y divide-line">
          {horarios.map((h) => {
            const inicioId = `horario-inicio-${h.diaSemana}`;
            const fimId = `horario-fim-${h.diaSemana}`;
            return (
              <div key={h.diaSemana} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-24 shrink-0">
                  <p className="text-sm font-medium text-ink">{DIAS_SEMANA[h.diaSemana]}</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <div
                    onClick={() => updateHorario(h.diaSemana, 'ativo', !h.ativo)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                      h.ativo ? 'bg-success' : 'bg-line'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-canvas shadow transition-transform duration-200 ${
                      h.ativo ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className={`text-xs font-medium ${h.ativo ? 'text-success' : 'text-muted'}`}>
                    {h.ativo ? 'Ativo' : 'Fechado'}
                  </span>
                </label>
                {h.ativo && (
                  <div className="flex items-center gap-2 text-sm">
                    <label htmlFor={inicioId} className="sr-only">Horário de início — {DIAS_SEMANA[h.diaSemana]}</label>
                    <input
                      id={inicioId}
                      type="time"
                      value={h.horaInicio}
                      onChange={(e) => updateHorario(h.diaSemana, 'horaInicio', e.target.value)}
                      className="border border-line rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <span className="text-muted text-xs">até</span>
                    <label htmlFor={fimId} className="sr-only">Horário de fim — {DIAS_SEMANA[h.diaSemana]}</label>
                    <input
                      id={fimId}
                      type="time"
                      value={h.horaFim}
                      onChange={(e) => updateHorario(h.diaSemana, 'horaFim', e.target.value)}
                      className="border border-line rounded-lg px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-5 py-4 border-t border-line flex flex-col items-end gap-2">
          <button
            onClick={handleSaveHorarios}
            disabled={savingHorarios}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep text-white text-sm font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" strokeWidth={2} />
            {savingHorarios ? 'Salvando...' : 'Salvar e Publicar Horários'}
          </button>
          {ultimaAtualizacao && !savingHorarios && (
            <p className="text-xs text-success font-medium inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Publicado em {new Date(ultimaAtualizacao).toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                timeZone: 'America/Sao_Paulo',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorariosTab;
