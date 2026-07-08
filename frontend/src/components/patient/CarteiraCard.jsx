import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CarteiraCard = ({ walletBalance, setWalletBalance }) => {
  const { token } = useAuth();
  const [showExtrato, setShowExtrato] = useState(false);
  const [extrato, setExtrato] = useState(null);
  const [extratoLoading, setExtratoLoading] = useState(false);
  const [addingCredito, setAddingCredito] = useState(false);
  const [creditoToast, setCreditoToast] = useState(null);

  const fetchExtrato = async () => {
    setExtratoLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/paciente/extrato`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setExtrato(await res.json());
    } catch {}
    finally { setExtratoLoading(false); }
  };

  const handleAdicionarCredito = async () => {
    setAddingCredito(true);
    try {
      const res = await fetch(`${API_URL}/api/creditos/adicionar-teste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor: 50 }),
      });
      const data = await res.json();
      if (res.ok) {
        setWalletBalance(data.novo_saldo);
        setCreditoToast('R$ 50,00 adicionados!');
        setTimeout(() => setCreditoToast(null), 3000);
      }
    } catch {}
    finally { setAddingCredito(false); }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-wash flex items-center justify-center text-brand-deep font-bold shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v2M3 9h18l-1.5 10H4.5L3 9z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Carteira de créditos</p>
            <p className="text-sm font-bold text-gray-900">
              {walletBalance === null
                ? '...'
                : `R$ ${walletBalance.toFixed(2).replace('.', ',')}`}
            </p>
            {creditoToast && (
              <p className="text-xs text-green-600 font-semibold mt-0.5">{creditoToast}</p>
            )}
            <button
              onClick={() => { setShowExtrato(true); fetchExtrato(); }}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#3B9FE0', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', marginTop: 2 }}
            >
              Ver extrato
            </button>
          </div>
        </div>
        <button
          onClick={handleAdicionarCredito}
          disabled={addingCredito}
          className="shrink-0 text-xs font-bold bg-brand-wash hover:bg-brand/20 disabled:opacity-50 text-brand-deep px-4 py-2 rounded-lg transition"
        >
          {addingCredito ? '...' : '+ Adicionar créditos'}
        </button>
      </div>

      {/* Sheet de extrato da carteira */}
      {showExtrato && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExtrato(false)} />
          <div
            className="relative bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-md"
            style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '16px 16px 0 0' }}
          >
            <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Extrato da carteira</h2>
              <button
                onClick={() => setShowExtrato(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 28px' }}>
              {extratoLoading && (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 32 }}>Carregando...</p>
              )}
              {!extratoLoading && extrato && (
                <>
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, textAlign: 'right' }}>
                    Saldo atual: <strong style={{ color: '#111827' }}>R$ {extrato.saldo.toFixed(2).replace('.', ',')}</strong>
                  </p>
                  {extrato.transacoes.length === 0 ? (
                    <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 32 }}>
                      Nenhuma movimentação registrada.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {extrato.transacoes.map((t) => {
                        const isCredito = t.tipo === 'credito';
                        const isEstorno = t.tipo === 'estorno';
                        const cor = isCredito || isEstorno ? '#16a34a' : '#dc2626';
                        const sinal = isCredito || isEstorno ? '+' : '−';
                        const dt = new Date(t.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={t.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '11px 0', borderBottom: '1px solid #f3f4f6', gap: 12,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t.descricao}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{dt}</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: cor }}>
                                {sinal} R$ {t.valor.toFixed(2).replace('.', ',')}
                              </p>
                              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af' }}>
                                saldo: R$ {t.saldoApos.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CarteiraCard;
