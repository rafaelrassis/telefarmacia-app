import React, { useState } from 'react';

const STATUS = {
  FILA_AGENDADA:       { label: 'Agendada (aceita)',  cls: 'bg-brand-wash border-brand/40 text-brand-deep' },
  FILA_URGENTE:        { label: 'Urgente (aceita)',   cls: 'bg-alert-wash border-alert/40 text-alert' },
  FILA_EM_ATENDIMENTO: { label: 'Em atendimento',    cls: 'bg-success-wash border-success/40 text-success' },
};

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const VIEW_MODES = [
  { key: 'today',  label: 'Hoje' },
  { key: '2days',  label: '2 dias' },
  { key: '5days',  label: '5 dias' },
  { key: '7days',  label: 'Semana (7 dias)' },
];

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// delta de navegação por modo
const NAV_DELTA = { today: 1, '2days': 2, '5days': 7, '7days': 7 };

const WeekCalendar = ({ appointments = [], blocks = [], onEventClick, minHour = 7, maxHour = 20 }) => {
  const [viewMode, setViewMode] = useState('7days');
  const [anchor,   setAnchor]   = useState(() => getMonday(new Date()));

  const HOURS = Array.from({ length: Math.max(1, maxHour - minHour + 1) }, (_, i) => i + minHour);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calcula quais dias mostrar com base no modo e âncora
  const days = (() => {
    const a = new Date(anchor);
    if (viewMode === 'today') return [a];
    if (viewMode === '2days') return [a, addDays(a, 1)];
    const mon = getMonday(a);
    if (viewMode === '5days') return Array.from({ length: 5 }, (_, i) => addDays(mon, i));
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  })();

  const shiftView = (direction) => {
    setAnchor((prev) => addDays(prev, NAV_DELTA[viewMode] * direction));
  };

  const handleViewChange = (newMode) => {
    setViewMode(newMode);
    if (newMode === 'today' || newMode === '2days') {
      setAnchor(new Date(today));
    } else {
      // Para '5days' e '7days' ancor na segunda-feira da semana atual
      setAnchor(getMonday(anchor));
    }
  };

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

  const rangeLabel = (() => {
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (days.length === 1) {
      return days[0].toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
    const last = days[days.length - 1];
    return `${fmt(days[0])} – ${last.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  })();

  // Marca células cobertas por bloqueio: "dayIndex-hour" → motivo
  const blockedCells = {};
  blocks.forEach((b) => {
    const bStart = new Date(b.dataInicio);
    const bEnd   = new Date(b.dataFim);
    days.forEach((d, dayIdx) => {
      HOURS.forEach((hour) => {
        const cellStart = new Date(d);
        cellStart.setHours(hour, 0, 0, 0);
        const cellEnd = new Date(d);
        cellEnd.setHours(hour, 59, 59, 999);
        if (cellStart <= bEnd && cellEnd >= bStart) {
          blockedCells[`${dayIdx}-${hour}`] = b.motivo || 'Bloqueado';
        }
      });
    });
  });

  const hasAnyAppt = Object.keys(grid).length > 0 || Object.keys(blockedCells).length > 0;
  const colTemplate = `52px repeat(${days.length}, 1fr)`;

  return (
    <div className="bg-canvas border border-line rounded-xl overflow-hidden">

      {/* Seletor de visualização */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-line flex-wrap">
        {VIEW_MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleViewChange(key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === key
                ? 'bg-brand text-brand-contrast'
                : 'text-muted hover:text-ink hover:bg-surface'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
        <button
          onClick={() => shiftView(-1)}
          className="text-sm text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-surface transition"
        >
          ← Anterior
        </button>
        <p className="text-sm font-semibold text-ink text-center">{rangeLabel}</p>
        <button
          onClick={() => shiftView(1)}
          className="text-sm text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-surface transition"
        >
          Próxima →
        </button>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: days.length === 1 ? '320px' : '640px' }}>

          {/* Cabeçalho dos dias */}
          <div className="grid border-b border-line" style={{ gridTemplateColumns: colTemplate }}>
            <div className="py-3" />
            {days.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} className={`py-2 text-center border-l border-line ${isToday ? 'bg-brand-wash' : ''}`}>
                  <p className="text-xs text-muted">{DAYS_PT[d.getDay()]}</p>
                  <p className={`text-base font-bold mt-0.5 ${isToday ? 'text-brand-deep' : 'text-ink'}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Linhas de hora */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-line"
              style={{ gridTemplateColumns: colTemplate, minHeight: '52px' }}
            >
              <div className="py-1 px-2 text-xs text-muted leading-none pt-2">
                {String(hour).padStart(2, '0')}h
              </div>
              {days.map((d, dayIdx) => {
                const isToday   = d.toDateString() === today.toDateString();
                const appts     = grid[`${dayIdx}-${hour}`] || [];
                const motivo    = blockedCells[`${dayIdx}-${hour}`];
                return (
                  <div
                    key={dayIdx}
                    className={`border-l border-line p-1 relative ${isToday ? 'bg-brand-wash/40' : ''}`}
                  >
                    {motivo && (
                      <div
                        title={motivo}
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'repeating-linear-gradient(-45deg,var(--color-line),var(--color-line) 2px,var(--color-surface) 2px,var(--color-surface) 8px)',
                          opacity: 0.7,
                          zIndex: 0,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    {appts.map((appt) => {
                      const cfg       = STATUS[appt.status] || STATUS.FILA_AGENDADA;
                      const clickable = Boolean(onEventClick);
                      return (
                        <div
                          key={appt.id}
                          onClick={clickable ? () => onEventClick(appt) : undefined}
                          style={{ position: 'relative', zIndex: 1 }}
                          className={`rounded border px-1.5 py-1 mb-0.5 ${cfg.cls} ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        >
                          <p className="text-xs font-semibold truncate leading-tight">
                            {appt.patient?.name?.split(' ')[0] || 'Paciente'}
                          </p>
                          <p className="text-xs opacity-60 leading-tight">{fmtTime(appt.dateTime)}</p>
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
        <div className="py-10 text-center text-sm text-muted">
          Nenhum agendamento neste período.
        </div>
      )}
    </div>
  );
};

export default WeekCalendar;
