import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePharmacistToast } from '../../hooks/usePharmacistToast';
import { timeSince, playBeep } from '../../utils/pharmacistFormat';
import ToastBanner from './ToastBanner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Painel direito: Urgentes (polling 5s) ─────────────────────────────────────

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
    console.log('[UrgentesPanel] aceitar → id:', id, '| nomePaciente:', nomePaciente);
    setAccepting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/fila/urgente/${id}/aceitar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('[UrgentesPanel] resposta → status:', res.status, '| body:', data);
      if (res.ok) {
        setFila((p) => p.filter((f) => f.id !== id));
        showToast('success', `🚨 Atendimento aceito! Paciente: ${data.fila?.paciente?.name ?? nomePaciente}`);
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
      console.error('[UrgentesPanel] catch →', err);
      showToast('error', 'Falha de conexão.');
    }
    setAccepting((p) => ({ ...p, [id]: false }));
  };

  const temUrgentes = fila.length > 0;
  const bloqueado   = disponivelUrgencias === false;

  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-4 min-h-[220px] border-2 transition-colors duration-300 ${
      bloqueado   ? 'bg-gray-50 border-gray-200 opacity-80' :
      temUrgentes ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={`font-bold text-base ${bloqueado ? 'text-gray-500' : temUrgentes ? 'text-red-800' : 'text-gray-800'}`}>
          ⚡ Urgências
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={muted ? 'Som silenciado — clique para ativar' : 'Silenciar alertas sonoros'}
            className="text-lg leading-none opacity-60 hover:opacity-100 transition"
          >
            {muted ? '🔕' : '🔔'}
          </button>
          <span className="text-xs text-gray-400">↻ 5s</span>
        </div>
      </div>

      {bloqueado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
          Você está <strong>indisponível para urgências</strong>. Ative o toggle no topo do painel para aceitar novos atendimentos.
        </div>
      )}

      <ToastBanner toast={toast} />

      {temUrgentes ? (
        <div className="space-y-3 overflow-y-auto max-h-80">
          {fila.map((f) => (
            <div key={f.id} className="relative">
              {/* Anel pulsante ao redor do card */}
              <div className="absolute -inset-0.5 rounded-xl border-2 border-red-400 animate-ping opacity-25 pointer-events-none" />
              <div
                onClick={() => onCardClick?.({ id: f.id, tipo: 'urgente' })}
                className={`relative bg-white border-2 border-red-300 rounded-xl p-4 flex flex-col gap-3 ${onCardClick ? 'cursor-pointer hover:bg-red-50/30 transition-colors' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 animate-bounce" style={{ animationDuration: '1.2s' }}>🚨</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-red-800 text-sm leading-tight">
                      Paciente aguardando atendimento URGENTE!
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-1.5 truncate">{f.paciente?.name}</p>
                    <p className="text-xs text-red-600 mt-0.5">aguardando {timeSince(f.criadoEm)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); aceitar(f.id, f.paciente?.name); }}
                  disabled={accepting[f.id] || hasEmAtendimento || bloqueado}
                  title={
                    bloqueado         ? 'Ative "Disponível para urgências" para aceitar' :
                    hasEmAtendimento  ? 'Finalize o atendimento atual primeiro' : undefined
                  }
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition"
                >
                  {accepting[f.id] ? 'Aceitando...' : '🚨 Atender Agora'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <p className="text-sm text-gray-400">Nenhuma urgência no momento</p>
          <p className="text-xs text-gray-300">Verificando a cada 5s</p>
        </div>
      )}
    </div>
  );
};

export default UrgentesPanel;
