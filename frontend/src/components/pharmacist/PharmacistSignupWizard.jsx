import React, { useState, useEffect, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Select } from '../ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DRAFT_KEY = 'farmaconsulta_pharmacist_signup_draft';

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const ALL_TAGS = [
  'Dosagem Infantil',
  'Sintomas Leves',
  'Interação Medicamentosa',
  'Acompanhamento Crônico',
  'Dermatologia',
  'Nutrição e Suplementos',
];

const STEPS = [
  { key: 'account',      label: 'Conta' },
  { key: 'professional',  label: 'Dados profissionais' },
  { key: 'documents',    label: 'Documentos' },
  { key: 'review',       label: 'Revisão' },
];

const loadDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveDraft = (draft) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
};

const clearDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
};

const FileField = ({ label, file, onChange }) => {
  const ref = useRef();
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1.5">{label} <span className="text-error">*</span></label>
      <div
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${
          file ? 'border-brand bg-brand-wash' : 'border-line hover:border-brand/60 bg-surface'
        }`}
      >
        <span className="text-xl">{file ? '📄' : '⬆️'}</span>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${file ? 'text-brand-deep' : 'text-muted'}`}>
            {file ? file.name : 'Clique para selecionar'}
          </p>
          <p className="text-xs text-muted">JPG, PNG ou PDF · máx. 5MB</p>
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
    </div>
  );
};

const PharmacistSignupWizard = ({ onClose, embedded = false }) => {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const draft = loadDraft();

  const [stepIndex, setStepIndex] = useState(0);
  const [minStepIndex, setMinStepIndex] = useState(0);
  const [terminal, setTerminal] = useState(null); // null | 'exists' | 'pending'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Conta
  const [tempToken, setTempToken] = useState(null);
  const [accountMethod, setAccountMethod] = useState('google');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Dados pessoais + profissionais
  const [telefone, setTelefone] = useState(draft.telefone || '');
  const [crfNumber, setCrfNumber] = useState(draft.crfNumber || '');
  const [crfUF, setCrfUF] = useState(draft.crfUF || '');
  const [bio, setBio] = useState(draft.bio || '');
  const [selectedTags, setSelectedTags] = useState(draft.tags || []);

  // Documentos (arquivos não são persistidos em rascunho — não sobrevivem a reload)
  const [rgFile, setRgFile] = useState(null);
  const [crfFile, setCrfFile] = useState(null);

  // Se já existe uma sessão ativa, pula a etapa de conta e reaproveita o token atual.
  // Roda só uma vez ao montar — depois disso, o próprio wizard controla a navegação
  // (ex.: ao concluir o envio final, que também atualiza `user` para role FARMACEUTICO).
  useEffect(() => {
    if (!user) return;
    if (user.role === 'FARMACEUTICO') {
      onClose?.();
      navigate('/dashboard');
      return;
    }
    if (token) {
      setTempToken(token);
      setStepIndex(1);
      setMinStepIndex(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste rascunho dos campos de texto a cada mudança
  useEffect(() => {
    saveDraft({ telefone, crfNumber, crfUF, bio, tags: selectedTags });
  }, [telefone, crfNumber, crfUF, bio, selectedTags]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleTag = (tag) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

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

      if (data.isNewUser || data.user?.role === 'FARMACEUTICO') {
        setTempToken(data.token);
        setStepIndex(1);
      } else {
        setTerminal('exists');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha, nome }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao criar conta.'); return; }
      setTempToken(data.token);
      setStepIndex(1);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const validateProfessional = () => {
    if (!crfNumber.trim() || !crfUF.trim()) return 'Preencha o número do CRF e a UF.';
    if (!/^\d{1,6}$/.test(crfNumber.trim())) return 'Número do CRF inválido (somente dígitos, até 6 caracteres).';
    if (!UF_LIST.includes(crfUF.toUpperCase())) return 'UF do CRF inválida.';
    return '';
  };

  const goNext = () => {
    setError('');
    if (STEPS[stepIndex].key === 'professional') {
      const err = validateProfessional();
      if (err) { setError(err); return; }
    }
    if (STEPS[stepIndex].key === 'documents') {
      if (!rgFile || !crfFile) { setError('Envie os dois documentos para continuar.'); return; }
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStepIndex((i) => Math.max(i - 1, minStepIndex));
  };

  const handleFinalSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const onboardingRes = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tempToken}` },
        body: JSON.stringify({
          role: 'FARMACEUTICO',
          crfNumber, crfUF, bio, tags: selectedTags,
          phone: telefone,
        }),
      });
      const onboardingData = await onboardingRes.json();
      if (!onboardingRes.ok) {
        setError(onboardingData.error || 'Erro ao salvar perfil.');
        return;
      }

      const form = new FormData();
      form.append('foto_rg_cnh', rgFile);
      form.append('foto_crf', crfFile);
      const docRes = await fetch(`${API_URL}/api/farmaceuticos/cadastro`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${onboardingData.token}` },
        body: form,
      });
      const docData = await docRes.json();
      if (!docRes.ok) {
        setError(docData.error || 'Erro ao enviar documentos.');
        return;
      }

      login(onboardingData.token, onboardingData.user);
      clearDraft();
      setTerminal('pending');
      setTimeout(() => { onClose?.(); navigate('/dashboard'); }, 3500);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const currentKey = STEPS[stepIndex].key;

  const body = (
    <>
      {!terminal && (
        <div className="flex items-center gap-1.5 px-6 pt-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i <= stepIndex ? 'bg-brand' : 'bg-surface'}`} />
              <span className={`text-[10px] font-semibold ${i === stepIndex ? 'text-brand-deep' : 'text-muted'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 py-6">
        {terminal === 'exists' && (
            <div className="text-center py-4">
              <span className="text-4xl block mb-4">⚠️</span>
              <h3 className="font-bold text-ink mb-2">Conta já cadastrada como paciente</h3>
              <p className="text-sm text-muted leading-relaxed mb-6">
                Este e-mail já está associado a uma conta de paciente. Para se cadastrar como farmacêutico, use outro e-mail.
              </p>
              <button onClick={() => setTerminal(null)} className="text-sm text-brand-deep hover:underline">
                ← Tentar com outro e-mail
              </button>
            </div>
          )}

          {terminal === 'pending' && (
            <div className="text-center py-4">
              <span className="text-5xl block mb-4">🕐</span>
              <h3 className="font-bold text-ink mb-2">Cadastro enviado — Em análise</h3>
              <p className="text-sm text-muted leading-relaxed">
                Seus dados e documentos foram enviados. Um administrador vai revisar seu CRF e seus documentos
                — assim que aprovado, você recebe um aviso aqui na plataforma e sua conta é liberada
                automaticamente, sem precisar checar nada manualmente.
              </p>
              {accountMethod === 'email' && (
                <p className="text-xs text-muted leading-relaxed mt-3">
                  Não esqueça de confirmar seu e-mail — enviamos um link de confirmação para{' '}
                  <strong>{email}</strong>. Sem essa confirmação em até 24 horas, o cadastro é excluído
                  automaticamente.
                </p>
              )}
            </div>
          )}

          {!terminal && currentKey === 'account' && (
            <div>
              <div className="flex rounded-xl border border-line p-1 mb-5 bg-surface">
                {[{ key: 'google', label: 'Google' }, { key: 'email', label: 'E-mail e senha' }].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setAccountMethod(key); setError(''); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                      accountMethod === key ? 'bg-canvas text-brand-deep shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {accountMethod === 'google' ? (
                <div className="text-center">
                  <p className="text-sm text-muted mb-5">Entre com sua conta Google para começar.</p>
                  <div className="flex justify-center mb-4">
                    {loading ? (
                      <div className="h-10 flex items-center text-sm text-muted">Aguardando...</div>
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
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input label="Senha" type="password" placeholder="Mínimo 6 caracteres" minLength={6}
                    value={senha} onChange={(e) => setSenha(e.target.value)} required />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Criando conta...' : 'Continuar →'}
                  </Button>
                </form>
              )}

              <div className="mt-6 pt-4 border-t border-line">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: '🔒', label: 'CRF verificado' },
                    { icon: '💰', label: 'Ganhe por consulta' },
                    { icon: '🕐', label: 'Horários flexíveis' },
                  ].map((item) => (
                    <div key={item.label} className="text-xs text-muted">
                      <span className="block text-lg mb-1">{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!terminal && currentKey === 'professional' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Dados pessoais e profissionais.</p>
              <Input label="Telefone/WhatsApp (opcional)" placeholder="(11) 99999-8888"
                value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input label="Número do CRF *" placeholder="Ex: 12345"
                    value={crfNumber} onChange={(e) => setCrfNumber(e.target.value)} />
                </div>
                <div className="w-28">
                  <Select label="UF *" value={crfUF} onChange={(e) => setCrfUF(e.target.value.toUpperCase())}>
                    <option value="">--</option>
                    {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Biografia <span className="font-normal text-muted">(opcional)</span>
                </label>
                <textarea
                  placeholder="Conte brevemente sua especialidade e experiência..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-line rounded-lg text-sm focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">Áreas de atuação</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        selectedTags.includes(tag)
                          ? 'bg-brand text-white border-brand'
                          : 'bg-canvas text-muted border-line hover:border-brand/60'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!terminal && currentKey === 'documents' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Precisamos verificar sua identidade e seu registro no CRF.
              </p>
              <FileField label="RG ou CNH (frente)" file={rgFile} onChange={setRgFile} />
              <FileField label="Carteira do CRF" file={crfFile} onChange={setCrfFile} />
            </div>
          )}

          {!terminal && currentKey === 'review' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Confira seus dados antes de enviar.</p>
              <dl className="bg-surface rounded-xl p-4 space-y-2 text-sm">
                {telefone && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Telefone</dt>
                    <dd className="font-semibold text-ink">{telefone}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">CRF</dt>
                  <dd className="font-semibold text-ink">{crfNumber}/{crfUF}</dd>
                </div>
                {bio && (
                  <div>
                    <dt className="text-muted mb-0.5">Biografia</dt>
                    <dd className="text-ink">{bio}</dd>
                  </div>
                )}
                {selectedTags.length > 0 && (
                  <div>
                    <dt className="text-muted mb-1">Áreas de atuação</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {selectedTags.map((t) => (
                        <span key={t} className="text-xs bg-brand-wash text-brand-deep px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Documentos</dt>
                  <dd className="font-semibold text-ink">{rgFile?.name} · {crfFile?.name}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted">
                Sua conta será revisada por um administrador antes de ficar ativa para receber consultas.
              </p>
            </div>
          )}

          {error && !terminal && (
            <p className="mt-4 text-sm text-error bg-error-wash px-3 py-2 rounded-lg">{error}</p>
          )}

          {!terminal && currentKey !== 'account' && (
            <div className="flex gap-3 mt-6">
              {stepIndex > minStepIndex && (
                <Button variant="secondary" onClick={goBack} disabled={loading}>
                  ← Voltar
                </Button>
              )}
              {currentKey === 'review' ? (
                <Button className="flex-1" onClick={handleFinalSubmit} disabled={loading}>
                  {loading ? 'Enviando...' : 'Confirmar e enviar'}
                </Button>
              ) : (
                <Button className="flex-1" onClick={goNext} disabled={loading}>
                  Próximo →
                </Button>
              )}
            </div>
          )}
        </div>
    </>
  );

  if (embedded) {
    return <div className="w-full">{body}</div>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !terminal) onClose?.(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-canvas rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <div>
            <h2 className="font-heading text-lg font-bold text-ink">Cadastro de Farmacêutico</h2>
            <p className="text-sm text-muted mt-0.5">Junte-se à nossa plataforma</p>
          </div>
          {!terminal && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface hover:bg-line flex items-center justify-center text-muted transition"
            >
              ✕
            </button>
          )}
        </div>

        {body}
      </div>
    </div>
  );
};

export default PharmacistSignupWizard;
