import React, { useState } from 'react';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07h – 20h

const STATUS = {
  AGENDADO:           { label: 'Confirmado',        cls: 'bg-blue-50 border-blue-200 text-blue-800' },
  CONCLUIDO:          { label: 'Concluído',          cls: 'bg-green-50 border-green-300 text-green-800' },
  CANCELADO:          { label: 'Cancelado',          cls: 'bg-gray-100 border-gray-200 text-gray-400' },
  PENDENTE_PAGAMENTO: { label: 'Aguard. pagamento',  cls: 'bg-amber-50 border-amber-200 text-amber-800' },
};

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const WeekCalendar = ({ appointments = [] }) => {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const shiftWeek = (delta) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map: "dayIndex-hour" → appointments[]
  const grid = {};
  appointments.forEach((appt) => {
    const dt = new Date(appt.dateTime);
    const dayIdx = days.findIndex((d) => d.toDateString() === dt.toDateString());
    if (dayIdx === -1) return;
    const key = `${dayIdx}-${dt.getHours()}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(appt);
  });

  const weekRange = (() => {
    const end = days[6];
    const s = days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const e = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  })();

  const hasAnyAppt = Object.keys(grid).length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => shiftWeek(-1)}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
        >
          ← Anterior
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">{weekRange}</p>
        </div>
        <button
          onClick={() => shiftWeek(1)}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
        >
          Próxima →
        </button>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '640px' }}>
          {/* Day headers */}
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            <div className="py-3" />
            {days.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} className={`py-2 text-center border-l border-gray-100 ${isToday ? 'bg-violet-50' : ''}`}>
                  <p className="text-xs text-gray-400">{DAYS_PT[d.getDay()]}</p>
                  <p className={`text-base font-bold mt-0.5 ${isToday ? 'text-violet-700' : 'text-gray-700'}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-gray-50"
              style={{ gridTemplateColumns: '52px repeat(7, 1fr)', minHeight: '52px' }}
            >
              {/* Hour label */}
              <div className="py-1 px-2 text-xs text-gray-300 leading-none pt-2">
                {String(hour).padStart(2, '0')}h
              </div>

              {/* Day cells */}
              {days.map((d, dayIdx) => {
                const isToday = d.toDateString() === today.toDateString();
                const appts = grid[`${dayIdx}-${hour}`] || [];
                return (
                  <div
                    key={dayIdx}
                    className={`border-l border-gray-100 p-1 ${isToday ? 'bg-violet-50/40' : ''}`}
                  >
                    {appts.map((appt) => {
                      const cfg = STATUS[appt.status] || STATUS.AGENDADO;
                      return (
                        <div
                          key={appt.id}
                          className={`rounded border px-1.5 py-1 mb-0.5 ${cfg.cls}`}
                        >
                          <p className="text-xs font-semibold truncate leading-tight">
                            {appt.patient?.name?.split(' ')[0] || 'Paciente'}
                          </p>
                          <p className="text-xs opacity-60 leading-tight">{fmtTime(appt.dateTime)}</p>
                          {appt.googleMeetLink && appt.status === 'AGENDADO' && (
                            <a
                              href={appt.googleMeetLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs underline opacity-80 leading-tight"
                            >
                              Meet
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!hasAnyAppt && (
        <div className="py-10 text-center text-sm text-gray-400">
          Nenhum agendamento nesta semana.
        </div>
      )}
    </div>
  );
};

export default WeekCalendar;
