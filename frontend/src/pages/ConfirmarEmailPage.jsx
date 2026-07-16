import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MailCheck, TriangleAlert, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ConfirmarEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [error, setError] = useState('');
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return; // StrictMode/dev roda efeitos 2x — o endpoint é idempotente, mas evita 2 chamadas à toa
    requested.current = true;

    if (!token) {
      setStatus('error');
      setError('Link inválido. Solicite um novo cadastro ou reenvie a confirmação pela tela de login.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/confirmar-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('error');
          setError(data.error || 'Não foi possível confirmar seu e-mail.');
          return;
        }
        setStatus('success');
      } catch {
        setStatus('error');
        setError('Erro de conexão. Tente novamente.');
      }
    })();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-brand-wash via-canvas to-brand-wash px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-ink">Confirmação de e-mail</h1>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-brand-wash border border-brand/20 p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-brand mx-auto mb-3 animate-spin" />
              <p className="text-sm text-ink">Confirmando seu e-mail...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <MailCheck className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-sm text-ink mb-4">
                E-mail confirmado com sucesso. Você já pode entrar normalmente.
              </p>
              <Link
                to="/entrar"
                className="inline-block w-full bg-brand hover:bg-brand-deep text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                Ir para o login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <TriangleAlert className="w-10 h-10 text-error mx-auto mb-3" />
              <p className="text-sm text-ink mb-4">{error}</p>
              <Link
                to="/entrar"
                className="inline-block w-full bg-brand hover:bg-brand-deep text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                Voltar ao login
              </Link>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted hover:text-brand-deep transition">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEmailPage;
