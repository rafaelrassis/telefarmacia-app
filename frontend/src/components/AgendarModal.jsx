import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fmtDt = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        weekday: 'short', day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

const AgendarModal = ({ onClose, onBooked, onAddCredits }) => {
  const { token } = useAuth();
  const [walletBalance, setWalletBalance] = useState(null);
  const [step, setStep] = useState('preview'); // 'preview' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isInsuficiente, setIsInsuficiente] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/carteira/saldo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setWalletBalance(d.saldo_disponivel ?? 0); })
      .catch(() => {});
  }, [token]);

  const handleAgendar = async () => {
    setStep('loading');
    setErrorMsg('');
    setIsInsuficiente(false);
    try {
      const res = await fetch(`${API_URL}/api/agendamentos/agendar-proximo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep('success');
        onBooked?.();
      } else if (res.status === 402) {
        setIsInsuficiente(true);
        setErrorMsg(data.error || 'Saldo insuficiente para realizar o agendamento.');
        setStep('error');
      } else {
        setErrorMsg(data.error || 'Não foi possível realizar o agendamento.');
        setStep('error');
      }
    } catch {
      setErrorMsg('Falha de conexão. Verifique sua internet e tente novamente.');
      setStep('error');
    }
  };

  const saldoOk = walletBalance !== null && walletBalance > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={step !== 'loading' ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        {/* ── Preview ── */}
        {step === 'preview' && (
          <>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-bold text-gray-900 text-lg">Agendar consulta</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Você será atendido pelo próximo farmacêutico disponível. O valor será debitado dos seus créditos.
              </p>
            </div>

            {/* Saldo */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Seu saldo disponível</span>
                <span className={`font-bold text-base ${
                  walletBalance === null ? 'text-gray-400' : saldoOk ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {walletBalance === null ? '...' : `R$ ${walletBalance.toFixed(2).replace('.', ',')}`}
                </span>
              </div>
            </div>

            {walletBalance !== null && !saldoOk && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
                <p className="text-sm font-semibold text-red-800">Saldo insuficiente</p>
                <button
                  onClick={onAddCredits}
                  className="text-xs text-red-600 hover:text-red-800 underline mt-0.5"
                >
                  Adicionar créditos à carteira
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAgendar}
                disabled={walletBalance !== null && !saldoOk}
                className="flex-1 py-2.5 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Confirmar
              </button>
            </div>
          </>
        )}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className="text-center py-10">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">Buscando próximo horário disponível...</p>
            <p className="text-xs text-gray-400 mt-1">Aguarde um instante</p>
          </div>
        )}

        {/* ── Sucesso ── */}
        {step === 'success' && (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 text-lg mb-1">Consulta agendada!</h2>
            {result && (
              <div className="bg-gray-50 rounded-xl p-4 my-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Farmacêutico</span>
                  <span className="font-semibold text-gray-800">{result.farmaceutico}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Data e hora</span>
                  <span className="font-semibold text-gray-800">{fmtDt(result.data_hora)}</span>
                </div>
                {result.preco_cobrado && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor debitado</span>
                    <span className="font-semibold text-gray-800">
                      R$ {Number(result.preco_cobrado).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition"
            >
              Ver meus agendamentos
            </button>
          </div>
        )}

        {/* ── Erro ── */}
        {step === 'error' && (
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 mb-2">
              {isInsuficiente ? 'Saldo insuficiente' : 'Não foi possível agendar'}
            </h2>
            <p className="text-sm text-gray-600 mb-5">{errorMsg}</p>
            <div className="flex gap-3">
              {isInsuficiente && (
                <button
                  onClick={onAddCredits}
                  className="flex-1 py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition"
                >
                  Adicionar créditos
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendarModal;
