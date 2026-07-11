import React, { useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CarteiraCard = ({ walletBalance, setWalletBalance, onOpenTopup }) => {
  const { token } = useAuth();
  const [showExtrato, setShowExtrato] = useState(false);
  const [extrato, setExtrato] = useState(null);
  const [extratoLoading, setExtratoLoading] = useState(false);

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

  return (
    <>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <button
          onClick={onOpenTopup}
          className="flex items-center gap-2 rounded-full bg-brand-wash hover:bg-brand/20 border border-line px-3 py-1.5 transition"
        >
          <span className="w-6 h-6 rounded-full bg-brand-deep flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-left">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted leading-none">Carteira</span>
            <span className="block text-sm font-bold text-brand-deep leading-tight">
              {walletBalance === null ? '...' : `R$ ${walletBalance.toFixed(2).replace('.', ',')}`}
            </span>
          </span>
        </button>
        <button
          onClick={() => { setShowExtrato(true); fetchExtrato(); }}
          className="text-[11px] font-semibold text-muted hover:text-brand-deep underline transition"
        >
          Ver extrato
        </button>
      </div>

      {/* Sheet de extrato da carteira */}
      {showExtrato && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExtrato(false)} />
          <div className="relative bg-canvas w-full sm:rounded-2xl shadow-2xl sm:max-w-md rounded-t-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 pt-[18px] shrink-0">
              <h2 className="font-heading text-base font-bold text-ink m-0">Extrato da carteira</h2>
              <button
                onClick={() => setShowExtrato(false)}
                className="text-muted hover:text-ink p-1"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pt-4 pb-7">
              {extratoLoading && (
                <p className="text-muted text-sm text-center mt-8">Carregando...</p>
              )}
              {!extratoLoading && extrato && (
                <>
                  <p className="text-xs text-muted mb-3 text-right">
                    Saldo atual: <strong className="text-ink">R$ {extrato.saldo.toFixed(2).replace('.', ',')}</strong>
                  </p>
                  {extrato.transacoes.length === 0 ? (
                    <p className="text-sm text-muted text-center mt-8">
                      Nenhuma movimentação registrada.
                    </p>
                  ) : (
                    <div className="flex flex-col">
                      {extrato.transacoes.map((t) => {
                        const isCredito = t.tipo === 'credito';
                        const isEstorno = t.tipo === 'estorno';
                        const cor = isCredito || isEstorno ? 'text-success' : 'text-error';
                        const sinal = isCredito || isEstorno ? '+' : '−';
                        const dt = new Date(t.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={t.id} className="flex justify-between items-center gap-3 py-[11px] border-b border-line">
                            <div className="flex-1 min-w-0">
                              <p className="m-0 text-[13px] font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                                {t.descricao}
                              </p>
                              <p className="m-0 mt-0.5 text-[11px] text-muted">{dt}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`m-0 text-sm font-bold ${cor}`}>
                                {sinal} R$ {t.valor.toFixed(2).replace('.', ',')}
                              </p>
                              <p className="m-0 mt-px text-[11px] text-muted">
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
