import React from 'react';
import TriagemDisplay from './TriagemDisplay';

const TriagemCollapsible = ({ triagem, pacienteNome, showTriagem, setShowTriagem, anexoReceitaUrl, onAbrirAnexo }) => {
  if (!triagem) return null;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setShowTriagem((p) => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: '#f9fafb', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, color: '#374151',
        }}
      >
        <span>Triagem do paciente</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{showTriagem ? '▲ Fechar' : '▼ Ver'}</span>
      </button>
      {showTriagem && (
        <div style={{ padding: '12px 14px', background: 'white', fontSize: 13, color: '#374151' }}>
          <TriagemDisplay triagem={triagem} solicitanteNome={pacienteNome} />
          {anexoReceitaUrl && (
            <button
              type="button"
              onClick={() => onAbrirAnexo?.(anexoReceitaUrl)}
              style={{
                marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 8, border: '1px solid #bfdbfe',
                background: '#eff6ff', color: '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              📎 Ver anexo da receita
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TriagemCollapsible;
