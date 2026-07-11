import React from 'react';

// Bloqueio total (overlay) quando algum sinal de alerta é marcado — não é um
// aviso inline: cobre a ficha inteira e força o encerramento da triagem.
const AlertaEmergencia = ({ onFechar }) => (
  <div style={{
    position: 'absolute', inset: 0, background: 'rgba(127,29,29,0.97)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '32px 24px', borderRadius: 16, zIndex: 10,
  }}>
    <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>🚨</div>
    <h3 style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: '0 0 12px', textAlign: 'center' }}>
      Procure atendimento presencial imediatamente
    </h3>
    <p style={{ color: '#fca5a5', fontSize: 14, textAlign: 'center', lineHeight: 1.5, margin: '0 0 8px' }}>
      Os sintomas informados indicam uma situação que{' '}
      <strong style={{ color: 'white' }}>não pode ser tratada por teleconsulta</strong>.
    </p>
    <p style={{ color: '#fca5a5', fontSize: 14, textAlign: 'center', lineHeight: 1.5, margin: '0 0 28px' }}>
      Ligue imediatamente para o{' '}
      <strong style={{ color: 'white', fontSize: 17 }}>SAMU (192)</strong>{' '}
      ou vá ao pronto-socorro mais próximo.
    </p>
    <button
      type="button"
      onClick={onFechar}
      style={{
        width: '100%', maxWidth: 280, padding: '13px 0', borderRadius: 8, border: 'none',
        background: 'white', color: '#7f1d1d', fontSize: 14, fontWeight: 700, cursor: 'pointer',
      }}
    >
      Fechar e cancelar
    </button>
  </div>
);

export default AlertaEmergencia;
