import React, { useState } from 'react';
import { ShieldCheck, TriangleAlert } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Segunda etapa do login quando a conta tem TOTP ativado — recebe o
// tempToken (escopo restrito, 5min) emitido por /auth/login ou /auth/google
// e troca por um código de 6 dígitos (ou backup code) pelo JWT final.
// O tempToken nunca é gravado nas chaves @Telefarmacia:* — vive só no state
// deste componente, perdido se a página recarregar (usuário loga de novo).
const TotpVerifyForm = ({ tempToken, onSuccess, onVoltar }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/totp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Código inválido.');
        return;
      }
      onSuccess(data.token, data.user, data.isNewUser);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-brand-deep mb-1">
        <ShieldCheck className="w-5 h-5 shrink-0" />
        <p className="text-sm font-bold">Verificação em duas etapas</p>
      </div>
      <p className="text-sm text-muted">
        Digite o código de 6 dígitos do seu aplicativo autenticador, ou um dos seus códigos de backup.
      </p>

      <div>
        <label htmlFor="totp-verify-code" className="block text-xs font-semibold text-muted mb-1">Código</label>
        <input
          id="totp-verify-code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          required
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm bg-canvas text-ink placeholder:text-muted caret-brand focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none tracking-widest text-center font-mono"
        />
      </div>

      {error && (
        <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg inline-flex items-center gap-1.5 w-full" role="alert">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {loading ? 'Verificando...' : 'Confirmar'}
      </button>

      <button
        type="button"
        onClick={onVoltar}
        className="w-full text-center text-xs text-muted hover:text-ink transition"
      >
        ← Voltar para o login
      </button>
    </form>
  );
};

export default TotpVerifyForm;
