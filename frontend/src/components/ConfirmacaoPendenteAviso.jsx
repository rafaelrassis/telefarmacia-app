import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mostrado tanto logo após o cadastro por credenciais (Fluxo 1) quanto
// quando um login é recusado por e-mail não confirmado (Fluxo 3) — mesma
// tela, mesmo botão de reenvio.
const ConfirmacaoPendenteAviso = ({ email, onVoltar }) => {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleReenviar = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/auth/reenviar-confirmacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setEnviado(true);
      setCooldown(60);
    } catch {
      // Falha de rede no reenvio não é crítica — o usuário ainda tem o
      // link original, se recebido. Silencioso, sem mensagem de erro.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <Mail className="w-10 h-10 text-brand mx-auto mb-3" />
      <p className="text-sm text-ink bg-brand-wash rounded-lg px-3 py-3 mb-3 leading-relaxed">
        Enviamos um link de confirmação para <strong>{email}</strong>. Você tem 24 horas para confirmar,
        ou o cadastro será excluído automaticamente.
      </p>
      {enviado && (
        <p className="text-xs text-success mb-3">Link reenviado — confira sua caixa de entrada.</p>
      )}
      <button
        type="button"
        onClick={handleReenviar}
        disabled={loading || cooldown > 0}
        className="text-brand-deep text-sm font-semibold hover:underline disabled:opacity-50 disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
      >
        {cooldown > 0 ? `Reenviar em ${cooldown}s` : loading ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
      </button>
      <p className="mt-4">
        <button
          type="button"
          onClick={onVoltar}
          className="text-muted text-xs hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          Voltar ao login
        </button>
      </p>
    </div>
  );
};

export default ConfirmacaoPendenteAviso;
