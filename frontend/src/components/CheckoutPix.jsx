import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const VALORES = [50, 100, 150, 200];

const MockQRCode = () => (
  <svg width="140" height="140" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="160" fill="white"/>
    <rect x="10" y="10" width="40" height="40" rx="2" fill="#1f2937"/>
    <rect x="16" y="16" width="28" height="28" rx="1" fill="white"/>
    <rect x="22" y="22" width="16" height="16" rx="1" fill="#1f2937"/>
    <rect x="110" y="10" width="40" height="40" rx="2" fill="#1f2937"/>
    <rect x="116" y="16" width="28" height="28" rx="1" fill="white"/>
    <rect x="122" y="22" width="16" height="16" rx="1" fill="#1f2937"/>
    <rect x="10" y="110" width="40" height="40" rx="2" fill="#1f2937"/>
    <rect x="16" y="116" width="28" height="28" rx="1" fill="white"/>
    <rect x="22" y="122" width="16" height="16" rx="1" fill="#1f2937"/>
    {[60,66,72,78,84,90,96,102].map((x, i) => (
      <React.Fragment key={x}>
        <rect x={x} y="10" width="4" height="4" fill={i%2===0?"#1f2937":"white"}/>
        <rect x={x} y="16" width="4" height="4" fill={i%3===0?"#1f2937":"white"}/>
        <rect x="10" y={x} width="4" height="4" fill={i%2===0?"#1f2937":"white"}/>
      </React.Fragment>
    ))}
    {[60,66,72,78,84,90,96,102].map((y, i) =>
      [60,66,72,78,84,90,96,102].map((x, j) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill={(i+j)%2===0?"#1f2937":"white"}/>
      ))
    )}
  </svg>
);

// ── Tela de recarga de créditos ───────────────────────────────────────────────
const CheckoutPix = ({ onSuccess, onCancel }) => {
  const { token } = useAuth();
  const [step, setStep]         = useState('select');  // 'select' | 'qr' | 'done'
  const [valor, setValor]       = useState(100);
  const [pagamentoId, setPagamentoId] = useState(null);
  const [qrCode, setQrCode]     = useState('');
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [novoSaldo, setNovoSaldo] = useState(null);
  const [error, setError]       = useState('');

  const gerarCobranca = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_URL}/api/pagamentos/simular-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor_pretendido: valor }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao gerar cobrança.'); return; }
      setPagamentoId(data.pagamento_id);
      setQrCode(data.qr_code_mock);
      setStep('qr');
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_URL}/api/pagamentos/${pagamentoId}/confirmar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao confirmar.'); return; }
      setNovoSaldo(data.novo_saldo_creditos);
      setStep('done');
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(qrCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (step === 'done') {
    return (
      <div className="bg-canvas border border-line rounded-xl max-w-sm mx-auto p-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-bold text-ink text-lg mb-1">Créditos adicionados!</p>
        <p className="text-sm text-muted mb-1">Seu novo saldo é:</p>
        <p className="text-3xl font-bold text-brand-deep mb-5">
          R$ {novoSaldo?.toFixed(2).replace('.', ',')}
        </p>
        <button
          onClick={onSuccess}
          className="w-full bg-brand hover:bg-brand-deep text-brand-contrast font-bold py-2.5 rounded-xl transition text-sm"
        >
          Continuar
        </button>
      </div>
    );
  }

  if (step === 'qr') {
    return (
      <div className="bg-canvas border border-line rounded-xl max-w-sm mx-auto overflow-hidden">
        <div className="bg-brand px-6 py-5 text-brand-contrast text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-wash mb-1">Recarga via PIX</p>
          <p className="text-2xl font-bold">R$ {valor.toFixed(2).replace('.', ',')}</p>
          <p className="text-xs text-brand-wash mt-1">Créditos para consultas</p>
        </div>
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="border-2 border-line rounded-xl p-3 inline-block bg-white">
              <MockQRCode />
            </div>
          </div>
          <p className="text-xs text-center text-muted mb-4">
            Escaneie pelo app do banco ou copie o código
          </p>
          <button
            onClick={copy}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition mb-3 ${
              copied
                ? 'bg-success-wash border-success/30 text-success'
                : 'bg-surface border-line text-ink hover:bg-line/60'
            }`}
          >
            {copied ? '✓ Código copiado!' : 'Copiar código PIX'}
          </button>

          {error && <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg mb-3">{error}</p>}

          <button
            onClick={confirmar}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-success hover:opacity-90 text-success-contrast transition disabled:opacity-60 mb-2"
          >
            {loading ? 'Confirmando...' : '✓ Confirmar pagamento'}
          </button>

          <button
            onClick={onCancel}
            className="w-full text-sm text-muted hover:text-ink transition py-1"
          >
            Cancelar e voltar
          </button>
        </div>
      </div>
    );
  }

  // step === 'select'
  return (
    <div className="bg-canvas border border-line rounded-xl max-w-sm mx-auto overflow-hidden">
      <div className="bg-brand px-6 py-5 text-brand-contrast text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-wash mb-1">Adicionar créditos</p>
        <p className="text-sm text-brand-wash">Escolha o valor para recarregar sua carteira</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {VALORES.map((v) => (
            <button
              key={v}
              onClick={() => setValor(v)}
              className={`py-3 rounded-xl border-2 font-bold text-sm transition ${
                valor === v
                  ? 'border-brand bg-brand-wash text-brand-deep'
                  : 'border-line text-muted hover:border-brand/60'
              }`}
            >
              R$ {v},00
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Outro valor</label>
          <input
            type="number"
            min="10"
            step="10"
            value={valor}
            onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand outline-none"
          />
        </div>

        {error && <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={gerarCobranca}
          disabled={loading || valor < 10}
          className="w-full bg-brand hover:bg-brand-deep disabled:opacity-50 text-brand-contrast font-bold py-2.5 rounded-xl transition text-sm"
        >
          {loading ? 'Gerando...' : `Gerar PIX de R$ ${valor.toFixed(2).replace('.', ',')}`}
        </button>
        <button
          onClick={onCancel}
          className="w-full text-sm text-muted hover:text-ink transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default CheckoutPix;
