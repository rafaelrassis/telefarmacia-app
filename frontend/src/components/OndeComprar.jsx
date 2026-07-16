import React, { useState } from 'react';
import { TriangleAlert, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AVISO_TRANSPARENCIA =
  'Parceria comercial: ao comprar pelos links abaixo, o FarmaConsulta pode receber comissão, sem custo adicional para você. A escolha da farmácia é livre e não afeta seu atendimento.';

// Extrai itens MIP da receita (campo `tipo === 'mip'` ou, caso ausente, todos os itens
// são tratados como MIP — cabe ao farmacêutico marcar. Aqui respeitamos o que vier).
function getMips(itens) {
  if (!Array.isArray(itens) || itens.length === 0) return [];
  const mips = itens.filter((i) => i.tipo === 'mip');
  return mips;
}

const OndeComprar = ({ parceiros = [], consultaId, itens = [], token }) => {
  const [loadingClique, setLoadingClique] = useState({});
  const mips = getMips(itens);

  if (!parceiros || parceiros.length === 0) return null;

  const handleClique = async ({ pharmacyId, produto, tipo }) => {
    const key = produto ? `${pharmacyId}-${produto}` : pharmacyId;
    setLoadingClique((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${API_URL}/api/parceiros/${pharmacyId}/click`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          consultaId: consultaId || null,
          produto:    produto    || null,
          tipo:       tipo       || 'home',
        }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {}
    finally {
      setLoadingClique((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="mt-1">
      {/* Divider */}
      <div className="h-px bg-line my-1 mb-4" />

      {/* Título */}
      <p className="text-[11px] font-bold text-muted mb-2.5 uppercase tracking-wide">
        Onde comprar
      </p>

      {/* Aviso de transparência */}
      <div className="flex items-start gap-1.5 bg-alert-wash border border-alert/30 rounded-lg px-2.5 py-2 mb-3">
        <TriangleAlert className="w-3.5 h-3.5 text-alert shrink-0 mt-0.5" />
        <p className="text-[11px] text-alert leading-relaxed m-0">
          {AVISO_TRANSPARENCIA}
        </p>
      </div>

      {/* Cards de parceiros */}
      <div className="flex flex-col gap-2.5">
        {parceiros.map((p) => {
          const mipsComTemplate = p.linkTemplate ? mips.slice(0, 3) : [];

          return (
            <div
              key={p.id}
              className="border border-line rounded-xl px-3.5 py-3 bg-surface"
            >
              {/* Cabeçalho do card */}
              <div className={`flex items-center justify-between gap-2.5 ${mipsComTemplate.length > 0 ? 'mb-2.5' : ''}`}>
                <div className="flex items-center gap-2">
                  {p.logoUrl ? (
                    <img
                      src={p.logoUrl}
                      alt={p.nome}
                      className="w-8 h-8 object-contain rounded-md bg-canvas border border-line"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-brand-wash flex items-center justify-center text-sm font-bold text-brand-deep shrink-0">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[13px] font-semibold text-ink">{p.nome}</span>
                </div>

                <button
                  onClick={() => handleClique({ pharmacyId: p.id, tipo: 'home' })}
                  disabled={loadingClique[p.id]}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand hover:bg-brand-deep text-brand-contrast rounded-lg text-xs font-bold whitespace-nowrap shrink-0 disabled:opacity-70 transition"
                >
                  {loadingClique[p.id] ? '...' : (<><ExternalLink className="w-3 h-3" />Visitar farmácia</>)}
                </button>
              </div>

              {/* Atalhos de produto — só MIPs com linkTemplate */}
              {mipsComTemplate.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {mipsComTemplate.map((med, i) => {
                    const key = `${p.id}-${med.medicamento}`;
                    return (
                      <button
                        key={i}
                        onClick={() => handleClique({ pharmacyId: p.id, produto: med.medicamento, tipo: 'mip' })}
                        disabled={loadingClique[key]}
                        className="px-2.5 py-1 bg-canvas border border-brand/40 rounded-full text-[11px] font-semibold text-brand-deep disabled:opacity-70 transition"
                      >
                        {loadingClique[key] ? '...' : `Buscar ${med.medicamento} aqui`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OndeComprar;
