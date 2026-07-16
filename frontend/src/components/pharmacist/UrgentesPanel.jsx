import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePharmacistToast } from '../../hooks/usePharmacistToast';
import { timeSince, playBeep } from '../../utils/pharmacistFormat';
import EmptyState from '../ui/EmptyState';
import ToastBanner from './ToastBanner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Urgentes aguardando (polling 5s) — maior criticidade da fila ─────────────

const UrgentesPanel = ({ onAccepted, onCardClick, hasEmAtendimento, disponivelUrgencias }) => {
  const { token } = useAuth();
  const [fila, setFila]           = useState([]);
  const [accepting, setAccepting] = useState({});
  const [toast, showToast]        = usePharmacistToast();
  const [muted, setMuted]         = useState(() => localStorage.getItem('@Telefarmacia:muteSom') === 'true');
  const mutedRef      = useRef(muted);
  const seenIds       = useRef(new Set());
  const titleInterval = useRef(null);
  const isFirstLoad   = useRef(true);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem('@Telefarmacia:muteSom', String(next));
      mutedRef.current = next;
      return next;
    });
  };

  function startTitleAlert(count) {
    if (titleInterval.current) return;
    titleInterval.current = setInterval(() => {
      document.title = document.title.startsWith('(')
        ? 'FarmaConsulta'
        : `(${count}) Nova urgência — FarmaConsulta`;
    }, 1500);
  }

  function stopTitleAlert() {
    if (titleInterval.current) {
      clearInterval(titleInterval.current);
      titleInterval.current = null;
    }
    document.title = 'FarmaConsulta';
  }

  useEffect(() => () => stopTitleAlert(), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fila/urgentes?status=aguardando`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFila(data);

      if (!isFirstLoad.current) {
        const novas = data.filter((f) => !seenIds.current.has(f.id));
        if (novas.length > 0) {
          if (!mutedRef.current) playBeep();
          if (Notification.permission === 'granted' && !mutedRef.current) {
            new Notification('Nova urgência — FarmaConsulta', {
              body: novas.length === 1
                ? 'Um paciente aguarda atendimento urgente.'
                : `${novas.length} pacientes aguardam atendimento urgente.`,
              icon: '/icon-192.svg',
            });
          }
          startTitleAlert(data.length);
        }
      }

      seenIds.current = new Set(data.map((f) => f.id));
      if (data.length === 0) stopTitleAlert();
      isFirstLoad.current = false;
    } catch {}
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const aceitar = async (id, nomePaciente) => {
    setAccepting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/fila/urgente/${id}/aceitar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFila((p) => p.filter((f) => f.id !== id));
        showToast('success', `Atendimento aceito! Paciente: ${data.fila?.paciente?.name ?? nomePaciente}`);
        onAccepted?.();
      } else if (res.status === 409) {
        showToast('error', 'Esta urgência já foi aceita por outro farmacêutico.');
        load();
      } else if (res.status === 403) {
        showToast('warn', data.error || 'Você está indisponível. Ative o toggle para aceitar urgências.');
      } else if (res.status === 400) {
        showToast('warn', data.error || 'Não foi possível aceitar este atendimento.');
        load();
      } else {
        showToast('error', data.error || 'Erro ao aceitar. Tente novamente.');
        load();
      }
    } catch (err) {
      showToast('error', 'Falha de conexão.');
    }
    setAccepting((p) => ({ ...p, [id]: false }));
  };

  const temUrgentes = fila.length > 0;
  const bloqueado   = disponivelUrgencias === false;

  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-4 border-2 transition-colors duration-300 ${
      bloqueado   ? 'bg-surface border-line opacity-80' :
      temUrgentes ? 'bg-error-wash border-error' : 'bg-canvas border-line'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`font-heading flex items-center gap-1.5 font-bold text-base ${bloqueado ? 'text-muted' : temUrgentes ? 'text-error' : 'text-ink'}`}>
          <Zap className="w-4 h-4" strokeWidth={2.5} />
          Urgências aguardando
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={muted ? 'Som silenciado — clique para ativar' : 'Silenciar alertas sonoros'}
            className="text-muted hover:text-ink transition"
          >
            {muted ? <VolumeX className="w-4 h-4" strokeWidth={2} /> : <Volume2 className="w-4 h-4" strokeWidth={2} />}
          </button>
          <span className="text-xs text-muted">↻ 5s</span>
        </div>
      </div>

      {bloqueado && (
        <div className="bg-alert-wash border border-alert/30 rounded-xl px-3 py-2.5 text-xs text-alert">
          Você está <strong>indisponível para urgências</strong>. Ative o toggle no topo do painel para aceitar novos atendimentos.
        </div>
      )}

      <ToastBanner toast={toast} />

      {temUrgentes ? (
        <div className="space-y-3 overflow-y-auto max-h-80">
          {fila.map((f) => (
            <div key={f.id} className="relative">
              {/* Anel pulsante ao redor do card */}
              <div className="absolute -inset-0.5 rounded-xl border-2 border-error animate-ping opacity-25 pointer-events-none" />
              <div
                onClick={() => onCardClick?.({ id: f.id, tipo: 'urgente' })}
                className={`relative bg-canvas border-2 border-error rounded-xl p-4 flex flex-col gap-3 ${onCardClick ? 'cursor-pointer hover:bg-error-wash/40 transition-colors' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-error shrink-0 animate-bounce [animation-duration:1.2s]" strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-error text-sm leading-tight">
                      Paciente aguardando atendimento URGENTE!
                    </p>
                    <p className="text-sm font-semibold text-ink mt-1.5 truncate">{f.paciente?.name}</p>
                    <p className="text-xs text-error mt-0.5">aguardando {timeSince(f.criadoEm)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); aceitar(f.id, f.paciente?.name); }}
                  disabled={accepting[f.id] || hasEmAtendimento || bloqueado}
                  title={
                    bloqueado         ? 'Ative "Disponível para urgências" para aceitar' :
                    hasEmAtendimento  ? 'Finalize o atendimento atual primeiro' : undefined
                  }
                  className="w-full bg-error hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-error-contrast font-bold py-2.5 rounded-xl text-sm transition"
                >
                  {accepting[f.id] ? 'Aceitando...' : 'Atender agora'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma urgência no momento"
          description="Verificando a cada 5s"
        />
      )}
    </div>
  );
};

export default UrgentesPanel;
