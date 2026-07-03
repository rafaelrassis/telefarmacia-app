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
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Excluir minha conta</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>
          {step === 1 ? (
            <>
              {/* Explicação */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', margin: '0 0 6px' }}>⚠️ O que acontece ao excluir sua conta</p>
                <ul style={{ fontSize: 12, color: '#7f1d1d', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Seus dados de cadastro (nome, e-mail, telefone, CPF) serão <strong>anonimizados</strong></li>
                  <li>Seu login será <strong>desativado permanentemente</strong></li>
                  <li>Você <strong>não poderá</strong> recuperar o acesso à conta</li>
                </ul>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: '0 0 6px' }}>📋 O que é mantido (obrigação legal)</p>
                <ul style={{ fontSize: 12, color: '#15803d', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Registros clínicos (consultas, receitas, orientações) são mantidos pelo prazo mínimo exigido pela legislação sanitária vigente</li>
                  <li>Esses registros ficam <strong>desvinculados</strong> de seus dados de contato identificáveis</li>
                  <li>Isso é exigido pelas normas do CFF e legislação de saúde</li>
                </ul>
              </div>

              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, textAlign: 'center' }}>
                Consultas futuras agendadas precisam ser canceladas antes da exclusão.
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep(2)}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'white', background: '#dc2626', cursor: 'pointer' }}
                >
                  Entendi, continuar
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmação com e-mail */}
              <p style={{ fontSize: 13, color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>
                Para confirmar, digite o e-mail da sua conta:<br />
                <strong style={{ color: '#111827' }}>{user?.email}</strong>
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErro(''); }}
                placeholder="seu@email.com"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
              />

              {erro && (
                <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10, background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
                  {erro}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setStep(1); setErro(''); setEmail(''); }}
                  disabled={loading}
                  style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer' }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={loading}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: 'white', background: '#dc2626', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
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
