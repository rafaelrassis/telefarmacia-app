import React from 'react';

const RetornoSugeridoForm = ({ retornoDias, setRetornoDias, retornoObs, setRetornoObs }) => (
  <div style={{ border: '1px solid #d1fae5', borderRadius: 12, overflow: 'hidden' }}>
    <div style={{ padding: '10px 14px', background: '#f0fdf4', borderBottom: '1px solid #d1fae5' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
        🔄 Sugerir retorno{' '}
        <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>(opcional)</span>
      </span>
    </div>
    <div style={{ padding: '12px 14px', background: 'white', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 13, color: '#374151', flexShrink: 0 }}>Retorno em</label>
        <input
          type="number" min="1" max="365"
          value={retornoDias}
          onChange={(e) => setRetornoDias(e.target.value)}
          placeholder="ex: 30"
          style={{ width: 80, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
        />
        <span style={{ fontSize: 13, color: '#6b7280' }}>dias</span>
      </div>
      {retornoDias && (
        <textarea
          value={retornoObs}
          onChange={(e) => setRetornoObs(e.target.value)}
          placeholder="Observação para o retorno (opcional)"
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none' }}
        />
      )}
    </div>
  </div>
);

export default RetornoSugeridoForm;
