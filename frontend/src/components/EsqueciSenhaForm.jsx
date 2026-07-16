import React, { useState } from 'react';
import { Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Fluxo 2 — sempre mostra a mesma mensagem genérica, exista ou não o e-mail
// (nunca revela se a conta existe).
const EsqueciSenhaForm = ({ onVoltar }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/auth/esqueci-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setEnviado(true);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="text-center">
        <p className="text-sm text-ink bg-brand-wash rounded-lg px-3 py-3 mb-4 leading-relaxed">
          Se este e-mail estiver cadastrado, enviamos um link de redefinição. Confira sua caixa de entrada.
        </p>
        <button
          type="button"
          onClick={onVoltar}
          className="text-brand-deep text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-muted mb-2">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>
      <div>
        <label htmlFor="esqueci-email" className="block text-xs font-semibold text-muted mb-1">E-mail</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="esqueci-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full pl-10 pr-3 py-2.5 border border-line rounded-lg text-sm bg-canvas text-ink placeholder:text-muted caret-brand focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-deep disabled:opacity-50 text-brand-contrast font-bold py-2.5 rounded-xl transition text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {loading ? 'Enviando...' : 'Enviar link de redefinição'}
      </button>

      <p className="text-center text-xs text-muted">
        <button
          type="button"
          onClick={onVoltar}
          className="text-brand-deep font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          Voltar ao login
        </button>
      </p>
    </form>
  );
};

export default EsqueciSenhaForm;
