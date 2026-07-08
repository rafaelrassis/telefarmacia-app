import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import OndeComprar from './OndeComprar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── PDF Viewer ────────────────────────────────────────────────────────────────
// Estratégia: fetch com auth → blob URL → iframe.
// Se o blob falhar ou o iframe disparar onError → fallback HTML estruturado.

const PdfViewer = ({ consultaId, tipo, token }) => {
  const [state,    setState]    = useState('loading'); // 'loading' | 'iframe' | 'fallback'
  const [blobUrl,  setBlobUrl]  = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setState('loading');

    // Timeout de 8s caso o fetch trave
    timeoutRef.current = setTimeout(() => {
      if (alive && state === 'loading') setState('fallback');
    }, 8000);

    fetch(`${API_URL}/api/paciente/consulta/${consultaId}/pdf?tipo=${tipo}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('PDF indisponível');
        return r.blob();
      })
      .then((blob) => {
        if (!alive) return;
        clearTimeout(timeoutRef.current);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setState('iframe');
      })
      .catch(() => {
        if (alive) {
          clearTimeout(timeoutRef.current);
          setState('fallback');
        }
      });

    return () => {
      alive = false;
      clearTimeout(timeoutRef.current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [consultaId, tipo, token]);

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Carregando PDF...</p>
      </div>
    );
  }

  if (state === 'iframe' && blobUrl) {
    return (
      <div
        style={{
          flex: 1, minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y pinch-zoom',
        }}
      >
        <iframe
          src={blobUrl}
          title="Receita"
          allow="fullscreen"
          onError={() => setState('fallback')}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    );
  }

  return null; // fallback é renderizado no pai com os dados estruturados
};

// ── Receita estruturada (fallback) ────────────────────────────────────────────

const ReceitaHtml = ({ receita, farmaceuticoNome, dataHora }) => {
  const dateStr = dataHora
    ? new Date(dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Cabeçalho estilizado (imita o PDF) */}
      <div style={{ background: '#3B9FE0', borderRadius: 10, padding: '14px 18px', marginBottom: 16, textAlign: 'center' }}>
        <p style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: 0 }}>FarmaConsulta</p>
        <p style={{ color: '#EAF6FE', fontSize: 12, margin: '3px 0 0' }}>Receita Farmacêutica</p>
      </div>

      {/* Dados */}
      {(farmaceuticoNome || dateStr) && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {farmaceuticoNome && <span><strong>Farmacêutico(a):</strong> {farmaceuticoNome}</span>}
          {dateStr && <span><strong>Data:</strong> {dateStr}</span>}
        </div>
      )}

      {/* Prescrição */}
      <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Prescrição
      </p>
      {Array.isArray(receita) && receita.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {receita.map((item, i) => (
            <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                {i + 1}. {item.medicamento}
                {item.dosagem && <span style={{ fontWeight: 400, color: '#6b7280' }}> — {item.dosagem}</span>}
              </p>
              {item.posologia && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>Posologia: {item.posologia}</p>
              )}
              {item.duracao && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Duração: {item.duracao}</p>
              )}
              {item.instrucoes && (
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{item.instrucoes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum medicamento prescrito.</p>
      )}

      <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 20, fontStyle: 'italic' }}>
        Orientação farmacêutica — não substitui prescrição médica
      </p>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const ReceitaViewer = ({ consultaId, tipo, data, onClose }) => {
  const { token } = useAuth();

  const hasReceita             = Array.isArray(data?.receita) && data.receita.length > 0;
  const hasReceitaPdf          = Boolean(data?.receitaPdfUrl);
  const hasEncaminhamentoPdf   = Boolean(data?.encaminhamentoPdfUrl);
  const hasOrientacoes         = Boolean(data?.observacoes?.trim());
  const showTabs               = hasOrientacoes || hasEncaminhamentoPdf;

  const [activeTab,    setActiveTab]    = useState('receita');
  const [pdfState,     setPdfState]     = useState(hasReceitaPdf ? 'loading' : 'fallback');
  const [blobUrl,      setBlobUrl]      = useState(null);
  const [downloading,  setDownloading]  = useState(false);
  const [sharing,      setSharing]      = useState(false);
  const [shareToast,   setShareToast]   = useState('');

  // Parceiros "Onde comprar"
  const [parceiros,      setParceiros]      = useState([]);
  const [ondeComprarAtivo, setOndeComprarAtivo] = useState(false);

  // Detectar mobile para ajuste de altura
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Carrega PDF como blob para o iframe
  useEffect(() => {
    if (!hasReceitaPdf) { setPdfState('fallback'); return; }
    let alive = true;
    const timeout = setTimeout(() => { if (alive) setPdfState('fallback'); }, 8000);

    fetch(`${API_URL}/api/paciente/consulta/${consultaId}/pdf?tipo=${tipo}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.blob() : Promise.reject())
      .then((blob) => {
        if (!alive) return;
        clearTimeout(timeout);
        setBlobUrl(URL.createObjectURL(blob));
        setPdfState('iframe');
      })
      .catch(() => { if (alive) { clearTimeout(timeout); setPdfState('fallback'); } });

    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, [consultaId, tipo, token, hasReceitaPdf]);

  // Revoga blob URL ao desmontar
  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  // Carrega parceiros (apenas para consulta concluída)
  useEffect(() => {
    fetch(`${API_URL}/api/parceiros`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setOndeComprarAtivo(d.ativo ?? false);
        setParceiros(d.parceiros ?? []);
      })
      .catch(() => {});
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let blob;
      if (blobUrl) {
        blob = await fetch(blobUrl).then((r) => r.blob());
      } else {
        const r = await fetch(`${API_URL}/api/paciente/consulta/${consultaId}/pdf?tipo=${tipo}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error('PDF não disponível.');
        blob = await r.blob();
      }
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `receita-${consultaId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    setShareToast('');
    try {
      let blob;
      if (blobUrl) {
        blob = await fetch(blobUrl).then((r) => r.blob());
      } else {
        const r = await fetch(`${API_URL}/api/paciente/consulta/${consultaId}/pdf?tipo=${tipo}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error('PDF não disponível.');
        blob = await r.blob();
      }

      const file = new File([blob], `receita-${consultaId}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Receita Farmacêutica',
          text: 'Receita da consulta farmacêutica.',
        });
      } else {
        // Fallback: download + instrução
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `receita-${consultaId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setShareToast('PDF baixado — compartilhe pelo seu gerenciador de arquivos.');
        setTimeout(() => setShareToast(''), 5000);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setShareToast('Não foi possível compartilhar. Tente baixar o PDF.');
        setTimeout(() => setShareToast(''), 5000);
      }
    } finally {
      setSharing(false);
    }
  };

  const MODAL_STYLE = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', background: 'white' }
    : {
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        padding: 16,
      };

  const CARD_STYLE = isMobile
    ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : {
        background: 'white', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 720, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      };

  return (
    <div style={MODAL_STYLE} onClick={isMobile ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={CARD_STYLE}>

        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
              📄 Visualizar receita
            </span>
            {/* Abas */}
            {showTabs && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { key: 'receita', label: 'Receita' },
                  ...(hasOrientacoes ? [{ key: 'orientacoes', label: 'Orientações' }] : []),
                  ...(hasEncaminhamentoPdf ? [{ key: 'encaminhamento', label: '📋 Encaminhamento' }] : []),
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      padding: '4px 10px', border: 'none', borderRadius: 20, fontSize: 12,
                      fontWeight: 600, cursor: 'pointer',
                      background: activeTab === key ? '#3B9FE0' : '#f3f4f6',
                      color:      activeTab === key ? 'white'    : '#6b7280',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            {hasReceitaPdf && (
              <>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  style={{
                    padding: '6px 12px', background: 'white', color: '#3B9FE0',
                    border: '1.5px solid #3B9FE0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: sharing ? 'wait' : 'pointer', opacity: sharing ? 0.7 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sharing ? '...' : '↗ Compartilhar'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  style={{
                    padding: '6px 12px', background: '#3B9FE0', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    cursor: downloading ? 'wait' : 'pointer', opacity: downloading ? 0.7 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {downloading ? 'Baixando...' : '⬇ Baixar PDF'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 4 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Share fallback toast */}
        {shareToast && (
          <div style={{
            padding: '8px 16px', background: '#fef3c7', borderBottom: '1px solid #fde68a',
            fontSize: 12, color: '#92400e', flexShrink: 0,
          }}>
            {shareToast}
          </div>
        )}

        {/* Corpo */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* ── Aba Receita ─────────────────────────────────────────────────── */}
          {activeTab === 'receita' && (
            <>
              {/* Viewer PDF ou fallback HTML */}
              {hasReceitaPdf && pdfState === 'loading' && (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Carregando receita...</p>
                </div>
              )}

              {hasReceitaPdf && pdfState === 'iframe' && blobUrl && (
                <div
                  style={{
                    flex: 1, minHeight: isMobile ? 'calc(100vh - 200px)' : 420,
                    touchAction: 'pan-x pan-y pinch-zoom',
                  }}
                >
                  <iframe
                    src={blobUrl}
                    title="Receita PDF"
                    allow="fullscreen"
                    onError={() => setPdfState('fallback')}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: isMobile ? 'calc(100vh - 200px)' : 420 }}
                  />
                </div>
              )}

              {/* Fallback HTML (PDF indisponível ou erro no iframe) */}
              {(pdfState === 'fallback' || !hasReceitaPdf) && (
                <div style={{ padding: '16px 20px' }}>
                  <ReceitaHtml
                    receita={data?.receita}
                    farmaceuticoNome={data?.farmaceuticoNome ?? data?.farmaceutico?.nome}
                    dataHora={data?.dataHora}
                  />
                </div>
              )}

              {/* Onde Comprar */}
              {ondeComprarAtivo && parceiros.length > 0 && (
                <div style={{ padding: '0 20px 24px' }}>
                  <OndeComprar
                    parceiros={parceiros}
                    consultaId={consultaId}
                    itens={data?.receita}
                    token={token}
                  />
                </div>
              )}
            </>
          )}

          {/* ── Aba Orientações ─────────────────────────────────────────────── */}
          {activeTab === 'orientacoes' && (
            <div style={{ padding: '16px 20px 24px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Orientações do farmacêutico
                </p>
                <p style={{ fontSize: 14, color: '#15803d', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {data?.observacoes}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'encaminhamento' && hasEncaminhamentoPdf && (
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 12, padding: '20px 24px', textAlign: 'center', maxWidth: 360, width: '100%' }}>
                <p style={{ fontSize: 32, margin: '0 0 8px' }}>📋</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f766e', margin: '0 0 4px' }}>
                  Documento de Encaminhamento
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                  Clique abaixo para baixar o PDF do encaminhamento gerado pelo farmacêutico.
                </p>
                <a
                  href={`${API_URL}/api/paciente/consulta/${consultaId}/pdf?tipo=${tipo}&doc=encaminhamento`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block', padding: '10px 24px',
                    background: '#0d9488', color: 'white', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  ⬇ Baixar encaminhamento
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceitaViewer;
