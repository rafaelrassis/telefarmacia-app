import React, { useState, useCallback, useEffect } from 'react';
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
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">Horários de funcionamento</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Define os dias e horários em que os pacientes podem agendar consultas.
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {horarios.map((h) => (
            <div key={h.diaSemana} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-24 shrink-0">
                <p className="text-sm font-medium text-gray-700">{DIAS_SEMANA[h.diaSemana]}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <div
                  onClick={() => updateHorario(h.diaSemana, 'ativo', !h.ativo)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                    h.ativo ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    h.ativo ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                <span className={`text-xs font-medium ${h.ativo ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {h.ativo ? 'Ativo' : 'Fechado'}
                </span>
              </label>
              {h.ativo && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    value={h.horaInicio}
                    onChange={(e) => updateHorario(h.diaSemana, 'horaInicio', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="text-gray-400 text-xs">até</span>
                  <input
                    type="time"
                    value={h.horaFim}
                    onChange={(e) => updateHorario(h.diaSemana, 'horaFim', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex flex-col items-end gap-2">
          <button
            onClick={handleSaveHorarios}
            disabled={savingHorarios}
            className="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {savingHorarios ? 'Salvando...' : '💾 Salvar e Publicar Horários'}
          </button>
          {ultimaAtualizacao && !savingHorarios && (
            <p className="text-xs text-green-600 font-medium">
              ✅ Publicado em {new Date(ultimaAtualizacao).toLocaleTimeString('pt-BR', {
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
