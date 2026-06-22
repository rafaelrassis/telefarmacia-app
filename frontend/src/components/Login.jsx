import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const ALL_TAGS = [
  'Dosagem Infantil',
  'Sintomas Leves',
  'Interação Medicamentosa',
  'Acompanhamento Crônico',
  'Dermatologia',
  'Nutrição e Suplementos',
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Onboarding (compartilhado entre Google e e-mail) ────────────────────────
const OnboardingForm = ({ tempToken, onDone }) => {
  const [role, setRole] = useState('PACIENTE');
  const [crfNumber, setCrfNumber] = useState('');
  const [crfUF, setCrfUF] = useState('');
  const [bio, setBio] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const handleSubmit = async () => {
    setError('');
    if (role === 'FARMACEUTICO' && (!crfNumber.trim() || !crfUF.trim())) {
      setError('Preencha o número do CRF e a UF.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempToken}` },
        body: JSON.stringify({ role, crfNumber, crfUF, bio, tags: selectedTags }),
      });
      const data = await res.json();
      if (res.ok) onDone(data.token, data.user);
      else setError(data.error || 'Erro ao salvar perfil.');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Complete seu perfil</h2>
        <p className="text-sm text-gray-500 mt-1">Só mais um passo para começar.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Você é:</label>
          <div className="grid grid-cols-2 gap-3">
            {['PACIENTE', 'FARMACEUTICO'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-3 rounded-xl border-2 font-semibold text-sm transition ${
                  role === r
                    ? 'border-violet-600 bg-violet-50 text-violet-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {r === 'PACIENTE' ? '🧑 Paciente' : '👨‍⚕️ Farmacêutico'}
              </button>
            ))}
          </div>
        </div>

        {role === 'FARMACEUTICO' && (
          <>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Número do CRF</label>
                <input
                  type="text"
                  placeholder="Ex: 12345"
                  value={crfNumber}
                  onChange={(e) => setCrfNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-semibold text-gray-600 mb-1">UF</label>
                <input
                  type="text"
                  placeholder="SP"
                  value={crfUF}
                  maxLength={2}
                  onChange={(e) => setCrfUF(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 uppercase outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Biografia <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                placeholder="Descreva brevemente sua especialidade..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Áreas de atuação</label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition ${
                      selectedTags.includes(tag)
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
      >
        {loading ? 'Salvando...' : 'Concluir Cadastro →'}
      </button>
    </div>
  );
};

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
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
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
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
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
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
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
          className="text-violet-600 font-semibold hover:underline"
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
  const [onboardingToken, setOnboardingToken] = useState(null);
  const [authMethod, setAuthMethod] = useState('google'); // 'google' | 'email'
  const [error, setError] = useState('');

  const handleAuthSuccess = (token, user, isNewUser) => {
    if (isNewUser) {
      setOnboardingToken(token);
    } else {
      login(token, user);
    }
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
      handleAuthSuccess(data.token, data.user, data.isNewUser);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  if (onboardingToken) {
    return (
      <OnboardingForm
        tempToken={onboardingToken}
        onDone={(token, user) => login(token, user)}
      />
    );
  }

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
                ? 'bg-white text-violet-700 shadow-sm'
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
