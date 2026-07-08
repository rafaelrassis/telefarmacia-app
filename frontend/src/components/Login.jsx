import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Formulário de e-mail/senha ───────────────────────────────────────────────
const EmailForm = ({ onSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { email, password, nome };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao processar requisição.');
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
      {mode === 'register' && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
          <input
            type="text"
            placeholder="Seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
        <input
          type="password"
          placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === 'register' ? 6 : undefined}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
      >
        {loading
          ? 'Aguarde...'
          : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </button>

      <p className="text-center text-xs text-gray-500">
        {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="text-brand-deep font-semibold hover:underline"
        >
          {mode === 'login' ? 'Criar conta' : 'Entrar'}
        </button>
      </p>
    </form>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────
const Login = () => {
  const { login } = useAuth();
  const [authMethod, setAuthMethod] = useState('google'); // 'google' | 'email'
  const [error, setError] = useState('');

  // Toda conta nova entra como PACIENTE (papel padrão do backend); virar
  // farmacêutico é um fluxo à parte (PharmacistSignupWizard), não uma
  // escolha feita aqui no primeiro login.
  const handleAuthSuccess = (token, user) => {
    login(token, user);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao autenticar.'); return; }
      handleAuthSuccess(data.token, data.user);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex rounded-xl border border-gray-200 p-1 mb-6 bg-gray-50">
        {[
          { key: 'google', label: 'Google' },
          { key: 'email',  label: 'E-mail e senha' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setAuthMethod(key); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              authMethod === key
                ? 'bg-white text-brand-deep shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {authMethod === 'google' ? (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-5">
            Entre ou crie uma conta usando sua conta Google.
          </p>
          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Falha na autenticação com o Google.')}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              locale="pt_BR"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-2">{error}</p>
          )}
        </div>
      ) : (
        <EmailForm onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
};

export default Login;
