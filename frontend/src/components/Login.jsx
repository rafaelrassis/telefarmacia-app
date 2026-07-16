import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PharmacistSignupWizard from './pharmacist/PharmacistSignupWizard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PROFILE_OPTIONS = [
  { key: 'paciente', label: 'Paciente', description: 'Tirar dúvidas sobre medicamentos' },
  { key: 'farmaceutico', label: 'Farmacêutico(a)', description: 'Atender pacientes na plataforma' },
];

// ── Formulário de e-mail/senha ───────────────────────────────────────────────
const EmailForm = ({ mode, setMode, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          <label htmlFor="login-nome" className="block text-xs font-semibold text-muted mb-1">Nome</label>
          <div className="relative">
            <User className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-nome"
              type="text"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              className="w-full pl-10 pr-3 py-2.5 border border-line rounded-lg text-sm bg-canvas text-ink placeholder:text-muted caret-brand focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="login-email" className="block text-xs font-semibold text-muted mb-1">E-mail</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="login-email"
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

      <div>
        <label htmlFor="login-senha" className="block text-xs font-semibold text-muted mb-1">Senha</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="login-senha"
            type={showPassword ? 'text' : 'password'}
            placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 6 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="w-full pl-10 pr-10 py-2.5 border border-line rounded-lg text-sm bg-canvas text-ink placeholder:text-muted caret-brand focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {loading
          ? 'Aguarde...'
          : mode === 'login' ? 'Entrar' : 'Criar conta'}
      </button>

      <p className="text-center text-xs text-muted">
        {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="text-brand-deep font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {mode === 'login' ? 'Criar conta' : 'Entrar'}
        </button>
      </p>
    </form>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────
const Login = ({ onModeChange }) => {
  const { login } = useAuth();
  const [authMethod, setAuthMethod] = useState('google'); // 'google' | 'email'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [profile, setProfile] = useState('paciente'); // 'paciente' | 'farmaceutico'
  const [error, setError] = useState('');

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

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
      {mode === 'register' && (
        <div className="mb-6">
          <p className="text-xs font-bold text-muted uppercase mb-2">Quero me cadastrar como</p>
          <div className="grid grid-cols-2 gap-3">
            {PROFILE_OPTIONS.map(({ key, label, description }) => {
              const selected = profile === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProfile(key)}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    selected ? 'border-brand bg-brand-wash text-brand-deep' : 'border-line bg-canvas text-ink'
                  }`}
                >
                  <span className="block text-sm font-bold">{label}</span>
                  <span className={`block text-xs mt-0.5 ${selected ? 'text-brand-deep' : 'text-muted'}`}>
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'register' && profile === 'farmaceutico' ? (
        <div>
          <p className="text-xs bg-brand-wash text-brand-deep rounded-lg px-3 py-2.5 mb-5 leading-relaxed">
            Seu cadastro passa por verificação do CRF antes de você começar a atender. Você pode salvar e continuar depois.
          </p>
          <PharmacistSignupWizard embedded />
        </div>
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex rounded-xl border border-line p-1 mb-6 bg-surface">
            {[
              { key: 'google', label: 'Google' },
              { key: 'email',  label: 'E-mail e senha' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setAuthMethod(key); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  authMethod === key
                    ? 'bg-canvas text-brand-deep shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {authMethod === 'google' ? (
            <div className="text-center">
              <p className="text-sm text-muted mb-5">
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
              <p className="text-xs text-muted mt-2">
                Se for seu primeiro acesso, sua conta é criada automaticamente.
              </p>
              {error && (
                <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg mt-2" role="alert">{error}</p>
              )}
            </div>
          ) : (
            <EmailForm mode={mode} setMode={setMode} onSuccess={handleAuthSuccess} />
          )}
        </>
      )}
    </div>
  );
};

export default Login;
