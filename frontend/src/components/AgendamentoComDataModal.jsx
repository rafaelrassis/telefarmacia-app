import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TriagemForm from './TriagemForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const calcIdade = (dataNasc) => {
  if (!dataNasc) return null;
  try {
    return new Date().getFullYear() - new Date(dataNasc).getFullYear();
  } catch { return null; }
};

const toLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const AgendamentoComDataModal = ({ onClose, onBooked, onAddCredits }) => {
  const { token } = useAuth();

  const [step, setStep] = useState('select'); // 'select' | 'triagem' | 'loading' | 'success' | 'error'
  const [sistemaInfo, setSistemaInfo] = useState(null); // { aberto, motivo }
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // "HH:MM"
  const [walletBalance, setWalletBalance] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isInsuficiente, setIsInsuficiente] = useState(false);
  const [pacientePerfil, setPacientePerfil] = useState(null);

  const today = toLocalDateStr();

  // Busca perfil do paciente para pré-preencher triagem
  useEffect(() => {
    fetch(`${API_URL}/api/pacientes/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPacientePerfil(d); })
      .catch(() => {});
  }, [token]);

  // Verifica se o sistema está aberto
  useEffect(() => {
    fetch(`${API_URL}/api/sistema/aberto`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setSistemaInfo(d); })
      .catch(() => setSistemaInfo({ aberto: true }));
  }, []);

  // Busca saldo
  useEffect(() => {
    fetch(`${API_URL}/api/carteira/saldo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setWalletBalance(d.saldo_disponivel ?? 0); })
      .catch(() => {});
  }, [token]);

  // Busca slots do sistema para a data selecionada
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`${API_URL}/api/disponibilidade?data=${selectedDate}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const handleConfirm = async (triagem) => {
    if (!selectedSlot) return;
    setStep('loading');
    setErrorMsg('');
    setIsInsuficiente(false);

    // Combina data + hora em ISO local
    const data_hora = `${selectedDate}T${selectedSlot}:00`;

    try {
      const res = await fetch(`${API_URL}/api/fila/agendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_hora, triagem: triagem || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep('success');
        onBooked?.();
      } else if (res.status === 402) {
        setIsInsuficiente(true);
        setErrorMsg(data.error || 'Saldo insuficiente.');
        setStep('error');
      } else {
        setErrorMsg(data.error || 'Erro ao realizar agendamento.');
        setStep('error');
      }
    } catch {
      setErrorMsg('Falha de conexão. Tente novamente.');
      setStep('error');
    }
  };

  const saldoOk = walletBalance !== null && walletBalance > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!['loading', 'triagem'].includes(step) ? onClose : undefined}
      />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
      >

        {/* ── Seleção de data e horário ── */}
        {step === 'select' && (
          <>
            {/* Cabeçalho fixo */}
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 className="font-bold text-gray-900 text-lg">Agendar Consulta</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                >
                  ×
                </button>
              </div>

              {/* Sistema fechado */}
              {sistemaInfo && !sistemaInfo.aberto && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-red-800">Sistema fechado no momento</p>
                  <p className="text-xs text-red-600 mt-0.5">{sistemaInfo.motivo}</p>
                  {sistemaInfo.horaInicio && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Horário: {sistemaInfo.horaInicio} – {sistemaInfo.horaFim}
                    </p>
                  )}
                </div>
              )}

              {/* Seletor de data */}
              <div style={{ marginBottom: 16 }}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Data da consulta
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
              </div>

              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Horário disponível
              </label>
            </div>

            {/* Lista de horários com scroll */}
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: 300, padding: '0 24px 8px' }}>
              {loadingSlots ? (
                <div className="flex justify-center items-center py-6">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : slots.length === 0 ? (
                <div className="bg-gray-50 rounded-xl py-5 text-center">
                  <p className="text-sm text-gray-400">Sem horários disponíveis nesta data.</p>
                  <p className="text-xs text-gray-300 mt-1">Tente outra data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => setSelectedSlot(hora)}
                      style={selectedSlot === hora ? {
                        background: '#2563eb', color: '#fff',
                        border: 'none', borderRadius: 12,
                        padding: '10px 0', fontSize: 14,
                        fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(37,99,235,0.3)',
                      } : {
                        background: '#fff', color: '#374151',
                        border: '1px solid #e5e7eb', borderRadius: 12,
                        padding: '10px 0', fontSize: 14,
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {hora}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé fixo — NUNCA some */}
            <div style={{
              borderTop: '1px solid #e5e7eb',
              padding: 16,
              background: 'white',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
            }}>
              {/* Saldo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="text-sm text-gray-500">Seu saldo</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: walletBalance === null ? '#9ca3af' : saldoOk ? '#059669' : '#ef4444' }}>
                  {walletBalance === null ? '...' : `R$ ${walletBalance.toFixed(2).replace('.', ',')}`}
                </span>
              </div>

              {walletBalance !== null && !saldoOk && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-center">
                  <p className="text-sm font-semibold text-red-800">Saldo insuficiente</p>
                  <button
                    onClick={onAddCredits}
                    className="text-xs text-red-600 hover:text-red-800 underline mt-0.5"
                  >
                    Adicionar créditos à carteira
                  </button>
                </div>
              )}

              {/* Botão próximo — só aparece quando horário selecionado */}
              {selectedSlot && (
                <button
                  onClick={() => setStep('triagem')}
                  disabled={!saldoOk}
                  style={{
                    background: saldoOk ? '#2563eb' : '#9ca3af',
                    color: 'white',
                    padding: '12px',
                    width: '100%',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 15,
                    fontWeight: 'bold',
                    cursor: saldoOk ? 'pointer' : 'not-allowed',
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  Próximo → Triagem ({selectedSlot})
                </button>
              )}

              <button
                onClick={onClose}
                style={{
                  width: '100%', padding: '10px',
                  background: 'transparent', border: '1px solid #e5e7eb',
                  borderRadius: 8, fontSize: 14, fontWeight: 500,
                  color: '#6b7280', cursor: 'pointer', display: 'block',
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* ── Triagem ── */}
        {step === 'triagem' && (
          <TriagemForm
            onBack={() => setStep('select')}
            onConfirm={handleConfirm}
            pacienteNome={pacientePerfil?.nome_completo || ''}
            pacienteIdade={calcIdade(pacientePerfil?.data_nascimento)}
          />
        )}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className="text-center py-10">
            <div className="w-10 h-10 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-700">Entrando na fila...</p>
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
            <h2 className="font-bold text-gray-900 text-lg mb-1">Consulta na fila!</h2>
            <p className="text-sm text-gray-500 mb-4">
              Um farmacêutico aceitará sua consulta em breve. Você será notificado.
            </p>
            {result && (
              <div className="bg-gray-50 rounded-xl p-4 my-3 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Data e hora</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(result.data_hora).toLocaleString('pt-BR', {
                      weekday: 'short', day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
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
              className="w-full py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition"
            >
              Fechar
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
              {isInsuficiente ? 'Saldo insuficiente' : 'Erro no agendamento'}
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
                onClick={() => { setStep('select'); setErrorMsg(''); setIsInsuficiente(false); }}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendamentoComDataModal;
