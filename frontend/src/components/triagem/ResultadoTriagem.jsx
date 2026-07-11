import React from 'react';

export const ResultadoLoading = () => (
  <div style={{ textAlign: 'center', padding: '40px 24px' }}>
    <div style={{ width: 40, height: 40, border: '2px solid #3B9FE0', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} />
    <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: 0 }}>Realizando agendamento...</p>
  </div>
);

export const ResultadoSucesso = ({ agResult, onFechar }) => (
  <div style={{ textAlign: 'center', padding: '32px 24px' }}>
    <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h2 style={{ fontWeight: 700, color: '#111827', fontSize: 18, margin: '0 0 8px' }}>Consulta agendada!</h2>
    <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Um farmacêutico aceitará sua consulta em breve.</p>
    {agResult && (
      <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
          <span style={{ color: '#6b7280' }}>Data e hora</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>
            {new Date(agResult.data_hora).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {agResult.preco_cobrado && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Valor debitado</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>R$ {Number(agResult.preco_cobrado).toFixed(2).replace('.', ',')}</span>
          </div>
        )}
      </div>
    )}
    <button onClick={onFechar} style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 700, background: '#3B9FE0', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
      Fechar
    </button>
  </div>
);

export const ResultadoErro = ({ agInsuficiente, agErrorMsg, onAddCredits, onTentarNovamente }) => (
  <div style={{ textAlign: 'center', padding: '32px 24px' }}>
    <div style={{ width: 56, height: 56, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    </div>
    <h2 style={{ fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{agInsuficiente ? 'Saldo insuficiente' : 'Erro no agendamento'}</h2>
    <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 20px' }}>{agErrorMsg}</p>
    <div style={{ display: 'flex', gap: 12 }}>
      {agInsuficiente && (
        <button onClick={onAddCredits} style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700, background: '#3B9FE0', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
          Adicionar créditos
        </button>
      )}
      <button onClick={onTentarNovamente} style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', background: 'white', color: '#374151' }}>
        Tentar novamente
      </button>
    </div>
  </div>
);
