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
      <div className="flex items-center justify-center" style={{ height: 200 }}>
        <p className="text-muted text-sm">Carregando PDF...</p>
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
    <div className="px-1">
      {/* Cabeçalho estilizado (imita o PDF) */}
      <div className="bg-brand rounded-[10px] px-[18px] py-3.5 mb-4 text-center">
        <p className="text-brand-contrast font-extrabold text-lg m-0">FarmaConsulta</p>
        <p className="text-brand-contrast/80 text-xs mt-[3px] mb-0">Receita Farmacêutica</p>
      </div>

      {/* Dados */}
      {(farmaceuticoNome || dateStr) && (
        <div className="bg-surface rounded-lg px-3 py-2.5 mb-3.5 text-[13px] text-ink flex flex-col gap-1">
          {farmaceuticoNome && <span><strong>Farmacêutico(a):</strong> {farmaceuticoNome}</span>}
          {dateStr && <span><strong>Data:</strong> {dateStr}</span>}
        </div>
      )}

      {/* Prescrição */}
      <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">
        Prescrição
      </p>
      {Array.isArray(receita) && receita.length > 0 ? (
        <div className="flex flex-col gap-2">
          {receita.map((item, i) => (
            <div key={i} className="bg-surface rounded-lg px-3 py-2">
              <p className="text-[13px] font-bold text-ink m-0">
                {i + 1}. {item.medicamento}
                {item.dosagem && <span className="font-normal text-muted"> — {item.dosagem}</span>}
              </p>
              {item.posologia && (
                <p className="text-xs text-muted mt-[3px] mb-0">Posologia: {item.posologia}</p>
              )}
              {item.duracao && (
                <p className="text-xs text-muted mt-0.5 mb-0">Duração: {item.duracao}</p>
              )}
              {item.instrucoes && (
                <p className="text-xs text-muted mt-0.5 mb-0">{item.instrucoes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted">Nenhum medicamento prescrito.</p>
      )}

      <p className="text-[11px] text-muted text-center mt-5 italic">
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

  const modalClassName = isMobile
    ? 'fixed inset-0 z-[60] flex flex-col bg-canvas'
    : 'fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4';

  const cardClassName = isMobile
    ? 'flex-1 flex flex-col overflow-hidden'
    : 'bg-canvas border border-line rounded-2xl shadow-md w-full max-w-[720px] max-h-[92vh] flex flex-col overflow-hidden';

  return (
    <div className={modalClassName} onClick={isMobile ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cardClassName}>

        {/* Header */}
        <div className="px-4 py-3.5 border-b border-line flex items-center justify-between shrink-0 gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="text-[15px] font-bold text-ink whitespace-nowrap">
              📄 Visualizar receita
            </span>
            {/* Abas */}
            {showTabs && (
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: 'receita', label: 'Receita' },
                  ...(hasOrientacoes ? [{ key: 'orientacoes', label: 'Orientações' }] : []),
                  ...(hasEncaminhamentoPdf ? [{ key: 'encaminhamento', label: '📋 Encaminhamento' }] : []),
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-2.5 py-1 border-none rounded-full text-xs font-semibold cursor-pointer ${
                      activeTab === key ? 'bg-brand text-brand-contrast' : 'bg-surface text-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0 items-center">
            {hasReceitaPdf && (
              <>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="px-3 py-1.5 bg-canvas text-brand border-[1.5px] border-brand rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-70"
                  style={{ cursor: sharing ? 'wait' : 'pointer' }}
                >
                  {sharing ? '...' : '↗ Compartilhar'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-3 py-1.5 bg-brand text-brand-contrast border-none rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-70"
                  style={{ cursor: downloading ? 'wait' : 'pointer' }}
                >
                  {downloading ? 'Baixando...' : '⬇ Baixar PDF'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="bg-transparent border-none text-[22px] cursor-pointer text-muted hover:text-ink leading-none p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Share fallback toast */}
        {shareToast && (
          <div className="px-4 py-2 bg-alert-wash border-b border-alert/30 text-xs text-alert shrink-0">
            {shareToast}
          </div>
        )}

        {/* Corpo */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">

          {/* ── Aba Receita ─────────────────────────────────────────────────── */}
          {activeTab === 'receita' && (
            <>
              {/* Viewer PDF ou fallback HTML */}
              {hasReceitaPdf && pdfState === 'loading' && (
                <div className="p-8 text-center">
                  <p className="text-muted text-sm">Carregando receita...</p>
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
                <div className="px-5 py-4">
                  <ReceitaHtml
                    receita={data?.receita}
                    farmaceuticoNome={data?.farmaceuticoNome ?? data?.farmaceutico?.nome}
                    dataHora={data?.dataHora}
                  />
                </div>
              )}

              {/* Onde Comprar */}
              {ondeComprarAtivo && parceiros.length > 0 && (
                <div className="px-5 pb-6">
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
            <div className="px-5 pt-4 pb-6">
              <div className="bg-success-wash border border-success/30 rounded-[10px] px-4 py-3.5">
                <p className="text-[11px] font-bold text-success mb-2 uppercase tracking-wide">
                  Orientações do farmacêutico
                </p>
                <p className="text-sm text-success leading-[1.7] m-0 whitespace-pre-wrap">
                  {data?.observacoes}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'encaminhamento' && hasEncaminhamentoPdf && (
            <div className="py-6 px-5 flex flex-col items-center gap-4">
              <div className="bg-brand-wash border border-brand/30 rounded-xl px-6 py-5 text-center max-w-[360px] w-full">
                <p className="text-[32px] mb-2">📋</p>
                <p className="text-[15px] font-bold text-brand-deep mb-1">
                  Documento de Encaminhamento
                </p>
                <p className="text-[13px] text-muted mb-5">
                  Clique abaixo para baixar o PDF do encaminhamento gerado pelo farmacêutico.
                </p>
                <a
                  href={`${API_URL}/api/paciente/consulta/${consultaId}/pdf?tipo=${tipo}&doc=encaminhamento`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-6 py-2.5 bg-brand text-brand-contrast rounded-[10px] text-sm font-bold no-underline"
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
