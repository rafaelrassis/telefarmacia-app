import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ExcluirContaModal = ({ onClose }) => {
  const { user, token, logout } = useAuth();
  const [step,    setStep]    = useState(1); // 1=explicação, 2=confirmação
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState('');

  const handleExcluir = async () => {
    if (!email.trim()) { setErro('Digite seu e-mail para confirmar.'); return; }
    setLoading(true);
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/lgpd/excluir-conta`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir conta.');
      // Conta anonimizada — fazer logout
      alert('Sua conta foi excluída. Você será desconectado.');
      logout();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/65 p-4">
      <div className="bg-canvas border border-line rounded-2xl w-full max-w-[480px] flex flex-col overflow-hidden shadow-md">

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-line flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink m-0">Excluir minha conta</h2>
          <button onClick={onClose} className="bg-transparent border-none text-xl text-muted hover:text-ink cursor-pointer leading-none p-1">×</button>
        </div>

        <div className="px-5 pt-4 pb-5">
          {step === 1 ? (
            <>
              {/* Explicação */}
              <div className="bg-error-wash border border-error/30 rounded-[10px] px-3.5 py-3 mb-3.5">
                <p className="text-[13px] font-bold text-error mb-1.5">⚠️ O que acontece ao excluir sua conta</p>
                <ul className="text-xs text-error m-0 pl-4 leading-[1.8]">
                  <li>Seus dados de cadastro (nome, e-mail, telefone, CPF) serão <strong>anonimizados</strong></li>
                  <li>Seu login será <strong>desativado permanentemente</strong></li>
                  <li>Você <strong>não poderá</strong> recuperar o acesso à conta</li>
                </ul>
              </div>

              <div className="bg-success-wash border border-success/30 rounded-[10px] px-3.5 py-3 mb-[18px]">
                <p className="text-[13px] font-bold text-success mb-1.5">📋 O que é mantido (obrigação legal)</p>
                <ul className="text-xs text-success m-0 pl-4 leading-[1.8]">
                  <li>Registros clínicos (consultas, receitas, orientações) são mantidos pelo prazo mínimo exigido pela legislação sanitária vigente</li>
                  <li>Esses registros ficam <strong>desvinculados</strong> de seus dados de contato identificáveis</li>
                  <li>Isso é exigido pelas normas do CFF e legislação de saúde</li>
                </ul>
              </div>

              <p className="text-xs text-muted mb-4 text-center">
                Consultas futuras agendadas precisam ser canceladas antes da exclusão.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-line rounded-[10px] text-[13px] font-semibold text-ink bg-canvas cursor-pointer hover:bg-surface transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 border-none rounded-[10px] text-[13px] font-bold text-error-contrast bg-error hover:opacity-90 cursor-pointer transition"
                >
                  Entendi, continuar
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmação com e-mail */}
              <p className="text-[13px] text-ink mb-3.5 leading-relaxed">
                Para confirmar, digite o e-mail da sua conta:<br />
                <strong className="text-ink">{user?.email}</strong>
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErro(''); }}
                placeholder="seu@email.com"
                className="w-full box-border px-3 py-2.5 border border-line rounded-lg text-[13px] text-ink bg-canvas mb-2.5 outline-none"
              />

              {erro && (
                <p className="text-xs text-error mb-2.5 bg-error-wash px-2.5 py-1.5 rounded-md">
                  {erro}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep(1); setErro(''); setEmail(''); }}
                  disabled={loading}
                  className="flex-1 py-2.5 border border-line rounded-[10px] text-[13px] font-semibold text-ink bg-canvas cursor-pointer hover:bg-surface transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={loading}
                  className="flex-1 py-2.5 border-none rounded-[10px] text-[13px] font-bold text-error-contrast bg-error hover:opacity-90 disabled:opacity-70 transition"
                  style={{ cursor: loading ? 'wait' : 'pointer' }}
                >
                  {loading ? 'Excluindo...' : 'Excluir minha conta'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcluirContaModal;
