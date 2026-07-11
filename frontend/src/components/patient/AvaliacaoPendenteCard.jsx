import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AvaliacaoPendenteCard = () => {
  const { token } = useAuth();
  const [avaliacaoPendente,  setAvaliacaoPendente]  = useState(null);
  const [avaliacaoDismiss,   setAvaliacaoDismiss]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('avaliacaoDismiss') || '{}'); } catch { return {}; }
  });
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

  if (!avaliacaoPendente) return null;
  const dismissCount = avaliacaoDismiss[avaliacaoPendente.id] ?? 0;
  if (dismissCount >= 2) return null;
  const fmtData = new Date(avaliacaoPendente.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const handleDismiss = () => {
    const next = { ...avaliacaoDismiss, [avaliacaoPendente.id]: dismissCount + 1 };
    setAvaliacaoDismiss(next);
    try { localStorage.setItem('avaliacaoDismiss', JSON.stringify(next)); } catch {}
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
          setAvaliacaoEnviada(false);
          setAvaliacaoNota(0);
          setAvaliacaoComentario('');
        }, 2000);
      }
    } catch {}
    finally { setAvaliacaoEnviando(false); }
  };

  return (
    <div style={{
      background: '#EAF6FE', border: '1.5px solid #8ED2F6',
      borderRadius: 12, padding: '14px 16px',
    }}>
      {avaliacaoEnviada ? (
        <p style={{ fontSize: 14, color: '#3B9FE0', fontWeight: 700, margin: 0, textAlign: 'center' }}>
          ✓ Avaliação enviada! Obrigado.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1D74B8' }}>Como foi sua consulta?</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#3B9FE0' }}>
                {avaliacaoPendente.farmaceutico ? `Com ${avaliacaoPendente.farmaceutico.split(' ')[0]}` : 'Consulta'} · {fmtData}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8ED2F6', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}
              aria-label="Agora não"
            >
              ×
            </button>
          </div>

          {/* Estrelas */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setAvaliacaoNota(n)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 28, lineHeight: 1,
                  color: n <= avaliacaoNota ? '#f59e0b' : '#e5e7eb',
                  transition: 'color 0.1s',
                }}
                aria-label={`${n} estrelas`}
              >
                ★
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
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  border: '1px solid #8ED2F6', borderRadius: 8,
                  padding: '8px 10px', fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', marginBottom: 10, color: '#374151',
                  background: 'white',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDismiss}
                  style={{
                    flex: 1, padding: '9px 0', background: 'white',
                    border: '1px solid #8ED2F6', borderRadius: 8,
                    fontSize: 13, color: '#3B9FE0', cursor: 'pointer',
                  }}
                >
                  Agora não
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={avaliacaoEnviando}
                  style={{
                    flex: 2, padding: '9px 0', background: '#3B9FE0', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: avaliacaoEnviando ? 'not-allowed' : 'pointer',
                    opacity: avaliacaoEnviando ? 0.6 : 1,
                  }}
                >
                  {avaliacaoEnviando ? 'Enviando...' : 'Enviar avaliação'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AvaliacaoPendenteCard;
