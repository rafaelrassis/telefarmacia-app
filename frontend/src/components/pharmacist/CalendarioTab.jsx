import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import WeekCalendar from '../WeekCalendar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Aba Calendário ────────────────────────────────────────────────────────────

// Limites de segurança para a grade — evita uma grade absurda se algum dado
// vier corrompido (ex.: bloqueio com data errada).
const HOUR_FLOOR = 0;
const HOUR_CEIL  = 23;
const DEFAULT_MIN_HOUR = 7;
const DEFAULT_MAX_HOUR = 20;

const CalendarioTab = ({ refreshTrigger, onEventClick }) => {
  const { token } = useAuth();
  const [filaEvents, setFilaEvents]   = useState([]);
  const [bloqueios, setBloqueios]     = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [horaRange, setHoraRange]     = useState({ min: DEFAULT_MIN_HOUR, max: DEFAULT_MAX_HOUR });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/farmaceutico/calendario`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/farmaceutico/bloqueios`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/sistema/horarios`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : [])),
    ]).then(([calendario, bls, horarios]) => {
      setBloqueios(bls);
      setStats({
        total:         calendario.length,
        emAtendimento: calendario.filter((f) => f.status === 'em_atendimento').length,
        aceitas:       calendario.filter((f) => f.status === 'aceito').length,
      });
      // Normaliza para o formato que WeekCalendar espera
      setFilaEvents(
        calendario.map((f) => ({
          id:            f.id,
          dateTime:      f.data_hora,
          patient:       { name: f.paciente_nome },
          status:        f.status === 'em_atendimento' ? 'FILA_EM_ATENDIMENTO' :
                         f.tipo === 'urgente' ? 'FILA_URGENTE' : 'FILA_AGENDADA',
          _tipo:         f.tipo,
        }))
      );

      // A grade não pode ficar presa a um intervalo fixo (ex.: 07h–20h) —
      // deriva do horário de funcionamento configurado pelo admin e, por
      // segurança, também do que já está de fato agendado/bloqueado (caso
      // exista consulta ou bloqueio fora do horário configurado hoje).
      let min = DEFAULT_MIN_HOUR, max = DEFAULT_MAX_HOUR;
      const horariosAtivos = Array.isArray(horarios) ? horarios.filter((h) => h.ativo) : [];
      if (horariosAtivos.length > 0) {
        min = Math.min(...horariosAtivos.map((h) => parseInt(h.horaInicio, 10)));
        max = Math.max(...horariosAtivos.map((h) => {
          const [hh, mm] = h.horaFim.split(':').map(Number);
          return mm > 0 ? hh + 1 : hh; // arredonda pra cima se termina em hora quebrada
        }));
      }
      calendario.forEach((f) => {
        const h = new Date(f.data_hora).getHours();
        min = Math.min(min, h);
        max = Math.max(max, h + 1);
      });
      bls.forEach((b) => {
        min = Math.min(min, new Date(b.dataInicio).getHours());
        max = Math.max(max, new Date(b.dataFim).getHours() + 1);
      });
      min = Math.max(HOUR_FLOOR, Math.min(min, max - 1));
      max = Math.min(HOUR_CEIL, max);
      setHoraRange({ min, max });
    }).finally(() => setLoading(false));
  }, [token, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Contadores */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-canvas border border-line rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.emAtendimento}</p>
            <p className="text-xs text-muted mt-1">Em atendimento</p>
          </div>
          <div className="bg-canvas border border-line rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-brand-deep">{stats.aceitas}</p>
            <p className="text-xs text-muted mt-1">Aceitas</p>
          </div>
          <div className="bg-canvas border border-line rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-ink">{stats.total}</p>
            <p className="text-xs text-muted mt-1">Total</p>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-wash border border-brand/40 inline-block" />Agendada aceita</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-alert-wash border border-alert/40 inline-block" />Urgente aceita</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success-wash border border-success/40 inline-block" />Em atendimento</span>
      </div>

      {/* Calendário com os eventos da fila e bloqueios */}
      <WeekCalendar
        appointments={filaEvents}
        blocks={bloqueios}
        onEventClick={onEventClick}
        minHour={horaRange.min}
        maxHour={horaRange.max}
      />
    </div>
  );
};

export default CalendarioTab;
