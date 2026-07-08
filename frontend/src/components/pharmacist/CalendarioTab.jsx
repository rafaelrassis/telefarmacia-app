import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import WeekCalendar from '../WeekCalendar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Aba Calendário ────────────────────────────────────────────────────────────

const CalendarioTab = ({ refreshTrigger, onEventClick }) => {
  const { token } = useAuth();
  const [filaEvents, setFilaEvents]   = useState([]);
  const [bloqueios, setBloqueios]     = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/farmaceutico/calendario`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/farmaceutico/bloqueios`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : [])),
    ]).then(([calendario, bls]) => {
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
    }).finally(() => setLoading(false));
  }, [token, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Contadores */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-teal-700">{stats.emAtendimento}</p>
            <p className="text-xs text-gray-500 mt-1">Em atendimento</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.aceitas}</p>
            <p className="text-xs text-gray-500 mt-1">Aceitas</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-500 inline-block" />Agendada aceita</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-400 inline-block" />Urgente aceita</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-100 border border-teal-500 inline-block" />Em atendimento</span>
      </div>

      {/* Calendário com os eventos da fila e bloqueios */}
      <WeekCalendar
        appointments={filaEvents}
        blocks={bloqueios}
        onEventClick={onEventClick}
      />
    </div>
  );
};

export default CalendarioTab;
