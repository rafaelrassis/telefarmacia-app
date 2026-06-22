import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DAYS = [
  { dow: 1, label: 'Segunda-feira' },
  { dow: 2, label: 'Terça-feira' },
  { dow: 3, label: 'Quarta-feira' },
  { dow: 4, label: 'Quinta-feira' },
  { dow: 5, label: 'Sexta-feira' },
  { dow: 6, label: 'Sábado' },
  { dow: 0, label: 'Domingo' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const defaultSchedule = () =>
  DAYS.map(({ dow }) => ({
    dayOfWeek: dow,
    startTime: '08:00',
    endTime: '17:00',
    isActive: dow >= 1 && dow <= 5,
  }));

const groupByDate = (slots) =>
  slots.reduce((acc, slot) => {
    const key = new Date(slot.dateTime).toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: '2-digit',
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

const slotsPerDay = (startTime, endTime) => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, Math.floor(mins / 45));
};

const ScheduleManager = () => {
  const { token } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [schedule, setSchedule] = useState(defaultSchedule());
  const [slots, setSlots] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const fetchWeeklySchedule = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/pharmacists/me/weekly-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.isOnline);
        if (data.schedule.length > 0) {
          setSchedule(
            defaultSchedule().map((def) => {
              const found = data.schedule.find((s) => s.dayOfWeek === def.dayOfWeek);
              return found
                ? { dayOfWeek: found.dayOfWeek, startTime: found.startTime, endTime: found.endTime, isActive: found.isActive }
                : def;
            })
          );
        }
      }
    } finally {
      setLoadingInit(false);
    }
  }, [token]);

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`${API_URL}/api/pharmacists/me/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSlots(await res.json());
    } finally {
      setLoadingSlots(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWeeklySchedule();
    fetchSlots();
  }, [fetchWeeklySchedule, fetchSlots]);

  const updateDay = (dow, field, value) =>
    setSchedule((prev) => prev.map((d) => (d.dayOfWeek === dow ? { ...d, [field]: value } : d)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/pharmacists/weekly-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ schedule, isOnline }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', `Agenda salva! ${data.slotsGenerated} horários gerados para os próximos 28 dias.`);
        fetchSlots();
      } else {
        showMsg('error', data.error);
      }
    } catch {
      showMsg('error', 'Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slotId) => {
    setDeletingId(slotId);
    try {
      const res = await fetch(`${API_URL}/api/pharmacists/availability/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      } else {
        const d = await res.json();
        showMsg('error', d.error);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const activeDaysCount = schedule.filter((d) => d.isActive).length;
  const grouped = groupByDate(slots);

  if (loadingInit) {
    return <div className="text-gray-400 text-sm py-12 text-center">Carregando agenda...</div>;
  }

  return (
    <div className="space-y-5">

      {/* Online toggle */}
      <div className={`rounded-2xl border p-5 transition-all duration-200 ${isOnline ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className={`font-bold text-sm ${isOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isOnline ? 'Você está Online' : 'Você está Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isOnline
                ? 'Pacientes podem ver você no catálogo e agendar consultas pelos seus horários.'
                : 'Você não aparece no catálogo. Ative para receber agendamentos.'}
            </p>
          </div>
          <button
            onClick={() => setIsOnline((v) => !v)}
            className={`relative shrink-0 inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
            aria-label="Toggle online"
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isOnline ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Weekly schedule grid */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Agenda Semanal Recorrente</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina os dias e horários que você atende toda semana. Os slots são de 30 min + 15 min de intervalo.
          </p>
        </div>

        <div className="divide-y divide-slate-50">
          {DAYS.map(({ dow, label }) => {
            const day = schedule.find((d) => d.dayOfWeek === dow);
            if (!day) return null;
            const count = day.isActive ? slotsPerDay(day.startTime, day.endTime) : 0;
            return (
              <div
                key={dow}
                className={`flex items-center gap-3 sm:gap-5 px-5 py-3 transition-opacity ${!day.isActive ? 'opacity-40' : ''}`}
              >
                {/* Checkbox + label */}
                <label className="flex items-center gap-2 cursor-pointer w-36 sm:w-40 shrink-0">
                  <input
                    type="checkbox"
                    checked={day.isActive}
                    onChange={(e) => updateDay(dow, 'isActive', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>

                {/* Start */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 hidden sm:block">Das</span>
                  <select
                    value={day.startTime}
                    onChange={(e) => updateDay(dow, 'startTime', e.target.value)}
                    disabled={!day.isActive}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:cursor-not-allowed"
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* End */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 hidden sm:block">às</span>
                  <select
                    value={day.endTime}
                    onChange={(e) => updateDay(dow, 'endTime', e.target.value)}
                    disabled={!day.isActive}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:cursor-not-allowed"
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Slot count hint */}
                {day.isActive && count > 0 && (
                  <span className="text-xs text-slate-400 ml-auto hidden md:block shrink-0">
                    {count} horário{count !== 1 ? 's' : ''}/dia
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {activeDaysCount} dia{activeDaysCount !== 1 ? 's' : ''} ativo{activeDaysCount !== 1 ? 's' : ''}
            {' · '}Slots de 45 min (30 min consulta + 15 min intervalo)
            {' · '}Gera horários para os próximos 28 dias
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-sm"
          >
            {saving ? 'Salvando...' : 'Salvar e Gerar Horários'}
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {/* Generated slots list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Horários Gerados</h3>
          {!loadingSlots && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {slots.length} horário{slots.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="p-5">
          {loadingSlots ? (
            <p className="text-slate-400 text-sm text-center py-4">Carregando...</p>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-slate-400 text-sm">Nenhum horário gerado ainda.</p>
              <p className="text-slate-400 text-xs mt-1">Configure sua agenda acima e clique em "Salvar e Gerar Horários".</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([date, daySlots]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 capitalize">{date}</p>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${
                          slot.isBooked
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="font-semibold tabular-nums">
                          {new Date(slot.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {slot.isBooked ? (
                          <span className="text-xs">🔒</span>
                        ) : (
                          <button
                            onClick={() => handleDelete(slot.id)}
                            disabled={deletingId === slot.id}
                            className="text-slate-300 hover:text-red-500 transition disabled:opacity-40 leading-none font-bold"
                            title="Remover horário"
                          >
                            {deletingId === slot.id ? '·' : '×'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleManager;
