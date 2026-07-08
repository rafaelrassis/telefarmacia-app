import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScheduleManager from '../ScheduleManager';
import BloqueioModal from '../BloqueioModal';
import { fmtBloqueio } from '../../utils/pharmacistFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Aba Minha agenda ──────────────────────────────────────────────────────────

const AgendaTab = () => {
  const { token } = useAuth();
  const [bloqueios, setBloqueios]       = useState([]);
  const [loadingBloq, setLoadingBloq]   = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [msg, setMsg]                   = useState(null);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const fetchBloqueios = useCallback(async () => {
    setLoadingBloq(true);
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/bloqueios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBloqueios(await res.json());
    } finally {
      setLoadingBloq(false);
    }
  }, [token]);

  useEffect(() => { fetchBloqueios(); }, [fetchBloqueios]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/bloqueios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBloqueios((prev) => prev.filter((b) => b.id !== id));
        showMsg('success', 'Bloqueio removido.');
      } else {
        const d = await res.json();
        showMsg('error', d.error || 'Erro ao remover bloqueio.');
      }
    } catch {
      showMsg('error', 'Falha de conexão.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Grade semanal */}
      <ScheduleManager />

      {/* Bloqueios futuros */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Bloqueios de agenda</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Períodos em que você não estará disponível para consultas
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 bg-brand hover:bg-brand-deep text-white text-xs font-bold px-3 py-2 rounded-xl transition"
          >
            + Novo bloqueio
          </button>
        </div>

        {msg && (
          <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-xs border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {msg.text}
          </div>
        )}

        <div className="p-5">
          {loadingBloq ? (
            <p className="text-slate-400 text-sm text-center py-4">Carregando...</p>
          ) : bloqueios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📆</p>
              <p className="text-slate-400 text-sm">Nenhum bloqueio cadastrado.</p>
              <p className="text-slate-400 text-xs mt-1">Use o botão acima para bloquear períodos em que não estará disponível.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bloqueios.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl px-4 py-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {fmtBloqueio(b.dataInicio)} → {fmtBloqueio(b.dataFim)}
                    </p>
                    {b.motivo && (
                      <p className="text-xs text-slate-500 mt-0.5">{b.motivo}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deletingId === b.id}
                    className="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-40 text-sm font-bold transition px-2"
                    title="Remover bloqueio"
                  >
                    {deletingId === b.id ? '...' : '×'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <BloqueioModal
          onClose={() => setShowModal(false)}
          onSaved={() => { fetchBloqueios(); showMsg('success', 'Bloqueio criado com sucesso!'); }}
        />
      )}
    </div>
  );
};

export default AgendaTab;
