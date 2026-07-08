import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ALL_TAGS = [
  'Dosagem Infantil',
  'Sintomas Leves',
  'Interação Medicamentosa',
  'Acompanhamento Crônico',
  'Dermatologia',
  'Nutrição e Suplementos',
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PharmacistRegisterModal = ({ onClose }) => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('login'); // 'login' | 'form' | 'done' | 'exists'
  const [tempToken, setTempToken] = useState('');
  const [crfNumber, setCrfNumber] = useState('');
  const [crfUF, setCrfUF] = useState('');
  const [bio, setBio] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fecha modal ao pressionar Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Se já está logado como farmacêutico, redireciona direto
  useEffect(() => {
    if (user?.role === 'FARMACEUTICO') {
      onClose();
      navigate('/dashboard');
    }
  }, [user]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao autenticar.'); return; }

      if (data.isNewUser) {
        setTempToken(data.token);
        setStep('form');
      } else if (data.user?.role === 'FARMACEUTICO') {
        // Já é farmacêutico — faz login e redireciona
        login(data.token, data.user);
        onClose();
        navigate('/dashboard');
      } else {
        // É paciente com outra conta
        setStep('exists');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const handleSubmit = async () => {
    setError('');
    if (!crfNumber.trim() || !crfUF.trim()) {
      setError('Preencha o número do CRF e a UF.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempToken}` },
        body: JSON.stringify({ role: 'FARMACEUTICO', crfNumber, crfUF, bio, tags: selectedTags }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        setStep('done');
        setTimeout(() => { onClose(); navigate('/dashboard'); }, 2000);
      } else {
        setError(data.error || 'Erro ao salvar perfil.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Cadastro de Farmacêutico</h2>
            <p className="text-sm text-gray-400 mt-0.5">Junte-se à nossa plataforma</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-6">
          {/* STEP: Login */}
          {step === 'login' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-brand-wash rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👨‍⚕️</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Entre com sua conta Google para iniciar o cadastro como farmacêutico na plataforma.
                </p>
              </div>

              <div className="flex justify-center mb-4">
                {loading ? (
                  <div className="h-10 flex items-center text-sm text-gray-400">Aguardando...</div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Falha na autenticação com o Google.')}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    locale="pt_BR"
                  />
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center">{error}</p>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: '🔒', label: 'CRF verificado' },
                    { icon: '💰', label: 'Ganhe por consulta' },
                    { icon: '🕐', label: 'Horários flexíveis' },
                  ].map((item) => (
                    <div key={item.label} className="text-xs text-gray-500">
                      <span className="block text-lg mb-1">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: Form */}
          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">
                Preencha seus dados profissionais para completar o cadastro.
              </p>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Número do CRF <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Ex: 12345"
                    value={crfNumber}
                    onChange={(e) => setCrfNumber(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">UF <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="SP"
                    value={crfUF}
                    maxLength={2}
                    onChange={(e) => setCrfUF(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Biografia <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  placeholder="Conte brevemente sua especialidade e experiência..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none resize-none"
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
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        selectedTags.includes(tag)
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand/60'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-deep disabled:opacity-60 text-white font-bold py-3 rounded-xl transition mt-2"
              >
                {loading ? 'Enviando...' : 'Concluir Cadastro →'}
              </button>

              <p className="text-xs text-center text-gray-400">
                Sua conta será revisada pelo administrador antes de ficar ativa.
              </p>
            </div>
          )}

          {/* STEP: Already exists as patient */}
          {step === 'exists' && (
            <div className="text-center py-4">
              <span className="text-4xl block mb-4">⚠️</span>
              <h3 className="font-bold text-gray-800 mb-2">Conta já cadastrada como paciente</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Este e-mail já está associado a uma conta de paciente. Para se cadastrar como farmacêutico, use outro e-mail Google.
              </p>
              <button
                onClick={() => setStep('login')}
                className="text-sm text-brand-deep hover:underline"
              >
                ← Tentar com outro e-mail
              </button>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="text-center py-4">
              <span className="text-5xl block mb-4">🎉</span>
              <h3 className="font-bold text-gray-800 mb-2">Cadastro realizado!</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sua conta foi criada. Aguarde a aprovação do administrador para começar a atender.
                Você será redirecionado em instantes...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacistRegisterModal;
