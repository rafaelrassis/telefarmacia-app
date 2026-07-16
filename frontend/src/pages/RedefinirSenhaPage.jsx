import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, TriangleAlert } from 'lucide-react';
import { PasswordInput, strengthOf, STRENGTH_STYLE } from '../components/AlterarSenhaForm.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const RedefinirSenhaPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [error, setError] = useState('');

  const strength = strengthOf(novaSenha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setStatus('error');
      setError('Link inválido. Solicite uma nova redefinição de senha.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha, confirmarSenha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setError(data.error || 'Não foi possível redefinir sua senha.');
        return;
      }
      setStatus('success');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-brand-wash via-canvas to-brand-wash px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-ink">Redefinir senha</h1>
          <p className="text-muted mt-2 text-sm">Escolha uma nova senha para acessar sua conta.</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-xl shadow-brand-wash border border-brand/20 p-8">
          {status === 'success' ? (
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-sm text-ink mb-4">
                Senha redefinida com sucesso. Você já pode entrar com sua nova senha.
              </p>
              <Link
                to="/entrar"
                className="inline-block w-full bg-brand hover:bg-brand-deep text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                Ir para o login
              </Link>
            </div>
          ) : status === 'error' && !token ? (
            <div className="text-center">
              <TriangleAlert className="w-10 h-10 text-error mx-auto mb-3" />
              <p className="text-sm text-ink mb-4">{error}</p>
              <Link
                to="/entrar"
                className="inline-block w-full bg-brand hover:bg-brand-deep text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                Voltar ao login e solicitar novo link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <PasswordInput
                id="redefinir-nova-senha"
                label="Nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
              {strength && (
                <div className="-mt-2">
                  <div className="h-1 rounded-full bg-line overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${STRENGTH_STYLE[strength].barClass}`} />
                  </div>
                  <p className={`text-[11px] mt-1 font-semibold ${STRENGTH_STYLE[strength].textClass}`}>
                    Força da senha: {STRENGTH_STYLE[strength].label}
                  </p>
                </div>
              )}
              <PasswordInput
                id="redefinir-confirmar-senha"
                label="Confirmar nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
              />

              {error && (
                <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg" role="alert">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !novaSenha || !confirmarSenha}
                className="w-full bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm inline-flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>

              {status === 'error' && (
                <p className="text-center text-xs text-muted">
                  Link expirado ou já utilizado?{' '}
                  <Link to="/entrar" className="text-brand-deep font-semibold hover:underline">
                    Solicite um novo
                  </Link>
                </p>
              )}
            </form>
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

export default RedefinirSenhaPage;
