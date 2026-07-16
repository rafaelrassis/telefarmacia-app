import React, { useState, useCallback, useEffect } from 'react';
import { Star, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AvaliacaoPendenteCard = ({ onVisibleChange }) => {
  const { token } = useAuth();
  const [avaliacaoPendente,  setAvaliacaoPendente]  = useState(null);
  const [avaliacaoDismiss,   setAvaliacaoDismiss]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('avaliacaoDismiss') || '{}'); } catch { return {}; }
  });
  const [showForm,           setShowForm]            = useState(false);
  const [avaliacaoNota,      setAvaliacaoNota]       = useState(0);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('');
  const [avaliacaoEnviando,  setAvaliacaoEnviando]   = useState(false);
  const [avaliacaoEnviada,   setAvaliacaoEnviada]    = useState(false);

  const fetchAvaliacaoPendente = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/paciente/avaliacao-pendente`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAvaliacaoPendente(data);
    } catch {}
  }, [token]);

  useEffect(() => { fetchAvaliacaoPendente(); }, [fetchAvaliacaoPendente]);

  const dismissCount = avaliacaoPendente ? (avaliacaoDismiss[avaliacaoPendente.id] ?? 0) : 0;
  const visible = Boolean(avaliacaoPendente) && dismissCount < 2;

  useEffect(() => { onVisibleChange?.(visible); }, [visible, onVisibleChange]);

  if (!visible) return null;
  const fmtData = new Date(avaliacaoPendente.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const handleDismiss = () => {
    const next = { ...avaliacaoDismiss, [avaliacaoPendente.id]: dismissCount + 1 };
    setAvaliacaoDismiss(next);
    try { localStorage.setItem('avaliacaoDismiss', JSON.stringify(next)); } catch {}
    setShowForm(false);
  };

  const handleEnviar = async () => {
    if (!avaliacaoNota) return;
    setAvaliacaoEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/avaliacoes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consulta_id: avaliacaoPendente.id,
          tipo:        avaliacaoPendente.tipo,
          nota:        avaliacaoNota,
          comentario:  avaliacaoComentario.trim() || undefined,
        }),
      });
      if (res.ok) {
        setAvaliacaoEnviada(true);
        setTimeout(() => {
          setAvaliacaoPendente(null);
          setShowForm(false);
          setAvaliacaoEnviada(false);
          setAvaliacaoNota(0);
          setAvaliacaoComentario('');
        }, 2000);
      }
    } catch {}
    finally { setAvaliacaoEnviando(false); }
  };

  return (
    <>
      <div className="shrink-0 w-[230px] rounded-2xl border border-line bg-canvas p-4 flex flex-col gap-2 relative">
        <button
          onClick={handleDismiss}
          aria-label="Agora não"
          className="absolute top-3 right-3 text-muted hover:text-ink transition"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="w-8 h-8 rounded-full bg-alert-wash flex items-center justify-center text-alert shrink-0">
          <Star className="w-4 h-4" strokeWidth={2.5} />
        </span>
        <p className="font-heading text-sm font-bold text-ink">Como foi sua consulta?</p>
        <p className="text-xs text-muted leading-snug flex-1">
          {avaliacaoPendente.farmaceutico ? `Com ${avaliacaoPendente.farmaceutico.split(' ')[0]}` : 'Consulta'} · {fmtData}
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="bg-brand hover:bg-brand-deep text-brand-contrast text-xs font-bold px-3 py-2 rounded-lg transition"
        >
          Avaliar
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-canvas rounded-2xl shadow-2xl w-full max-w-sm p-6">
            {avaliacaoEnviada ? (
              <p className="flex items-center justify-center gap-2 text-sm font-bold text-success text-center">
                <Check className="w-5 h-5" strokeWidth={3} /> Avaliação enviada! Obrigado.
              </p>
            ) : (
              <>
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <p className="font-heading text-base font-bold text-ink">Como foi sua consulta?</p>
                    <p className="text-xs text-muted mt-0.5">
                      {avaliacaoPendente.farmaceutico ? `Com ${avaliacaoPendente.farmaceutico.split(' ')[0]}` : 'Consulta'} · {fmtData}
                    </p>
                  </div>
                  <button onClick={() => setShowForm(false)} aria-label="Fechar" className="text-muted hover:text-ink shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-1.5 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAvaliacaoNota(n)}
                      aria-label={`${n} estrelas`}
                      className="p-0"
                    >
                      <Star
                        className={`w-7 h-7 ${n <= avaliacaoNota ? 'text-alert' : 'text-line'}`}
                        fill={n <= avaliacaoNota ? 'currentColor' : 'none'}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>

                {avaliacaoNota > 0 && (
                  <>
                    <textarea
                      value={avaliacaoComentario}
                      onChange={(e) => setAvaliacaoComentario(e.target.value)}
                      placeholder="Comentário opcional..."
                      maxLength={500}
                      rows={2}
                      className="w-full resize-none border border-line rounded-lg px-3 py-2 text-sm outline-none mb-3 text-ink bg-canvas focus:ring-2 focus:ring-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDismiss}
                        className="flex-1 py-2.5 bg-canvas border border-line rounded-lg text-sm text-brand-deep"
                      >
                        Agora não
                      </button>
                      <button
                        onClick={handleEnviar}
                        disabled={avaliacaoEnviando}
                        className="flex-[2] py-2.5 bg-brand hover:bg-brand-deep disabled:opacity-60 text-brand-contrast rounded-lg text-sm font-bold transition"
                      >
                        {avaliacaoEnviando ? 'Enviando...' : 'Enviar avaliação'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AvaliacaoPendenteCard;
