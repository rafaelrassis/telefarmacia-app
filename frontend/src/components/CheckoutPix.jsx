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
      <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto p-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-bold text-gray-900 text-lg mb-1">Créditos adicionados!</p>
        <p className="text-sm text-gray-500 mb-1">Seu novo saldo é:</p>
        <p className="text-3xl font-bold text-violet-700 mb-5">
          R$ {novoSaldo?.toFixed(2).replace('.', ',')}
        </p>
        <button
          onClick={onSuccess}
          className="w-full bg-violet-700 hover:bg-violet-800 text-white font-bold py-2.5 rounded-xl transition text-sm"
        >
          Continuar
        </button>
      </div>
    );
  }

  if (step === 'qr') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto overflow-hidden">
        <div className="bg-violet-700 px-6 py-5 text-white text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Recarga via PIX</p>
          <p className="text-2xl font-bold">R$ {valor.toFixed(2).replace('.', ',')}</p>
          <p className="text-xs text-violet-200 mt-1">Créditos para consultas</p>
        </div>
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="border-2 border-gray-100 rounded-xl p-3 inline-block">
              <MockQRCode />
            </div>
          </div>
          <p className="text-xs text-center text-gray-400 mb-4">
            Escaneie pelo app do banco ou copie o código
          </p>
          <button
            onClick={copy}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition mb-3 ${
              copied
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {copied ? '✓ Código copiado!' : 'Copiar código PIX'}
          </button>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}

          <button
            onClick={confirmar}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-60 mb-2"
          >
            {loading ? 'Confirmando...' : '✓ Confirmar pagamento'}
          </button>

          <button
            onClick={onCancel}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition py-1"
          >
            Cancelar e voltar
          </button>
        </div>
      </div>
    );
  }

  // step === 'select'
  return (
    <div className="bg-white border border-gray-200 rounded-xl max-w-sm mx-auto overflow-hidden">
      <div className="bg-violet-700 px-6 py-5 text-white text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Adicionar créditos</p>
        <p className="text-sm text-violet-200">Escolha o valor para recarregar sua carteira</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {VALORES.map((v) => (
            <button
              key={v}
              onClick={() => setValor(v)}
              className={`py-3 rounded-xl border-2 font-bold text-sm transition ${
                valor === v
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-gray-200 text-gray-600 hover:border-violet-300'
              }`}
            >
              R$ {v},00
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Outro valor</label>
          <input
            type="number"
            min="10"
            step="10"
            value={valor}
            onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          onClick={gerarCobranca}
          disabled={loading || valor < 10}
          className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
        >
          {loading ? 'Gerando...' : `Gerar PIX de R$ ${valor.toFixed(2).replace('.', ',')}`}
        </button>
        <button
          onClick={onCancel}
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default CheckoutPix;
