import React, { useState } from 'react';

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
    <div style={{ marginTop: 4 }}>
      {/* Divider */}
      <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0 16px' }} />

      {/* Título */}
      <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Onde comprar
      </p>

      {/* Aviso de transparência */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
          ⚠️ {AVISO_TRANSPARENCIA}
        </p>
      </div>

      {/* Cards de parceiros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {parceiros.map((p) => {
          const mipsComTemplate = p.linkTemplate ? mips.slice(0, 3) : [];

          return (
            <div
              key={p.id}
              style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', background: '#fafafa' }}
            >
              {/* Cabeçalho do card */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: mipsComTemplate.length > 0 ? 10 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.logoUrl ? (
                    <img
                      src={p.logoUrl}
                      alt={p.nome}
                      style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, background: 'white', border: '1px solid #e5e7eb' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4338ca', flexShrink: 0 }}>
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.nome}</span>
                </div>

                <button
                  onClick={() => handleClique({ pharmacyId: p.id, tipo: 'home' })}
                  disabled={loadingClique[p.id]}
                  style={{
                    padding: '6px 12px', background: '#3B9FE0', color: 'white',
                    border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700,
                    cursor: loadingClique[p.id] ? 'wait' : 'pointer',
                    opacity: loadingClique[p.id] ? 0.7 : 1,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {loadingClique[p.id] ? '...' : 'Visitar farmácia'}
                </button>
              </div>

              {/* Atalhos de produto — só MIPs com linkTemplate */}
              {mipsComTemplate.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mipsComTemplate.map((med, i) => {
                    const key = `${p.id}-${med.medicamento}`;
                    return (
                      <button
                        key={i}
                        onClick={() => handleClique({ pharmacyId: p.id, produto: med.medicamento, tipo: 'mip' })}
                        disabled={loadingClique[key]}
                        style={{
                          padding: '4px 10px', background: 'white',
                          border: '1px solid #8ED2F6', borderRadius: 20,
                          fontSize: 11, fontWeight: 600, color: '#3B9FE0',
                          cursor: loadingClique[key] ? 'wait' : 'pointer',
                          opacity: loadingClique[key] ? 0.7 : 1,
                        }}
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
