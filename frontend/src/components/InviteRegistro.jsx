import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, IdCard, Wallet, Link2Off, PartyPopper } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const InviteRegistro = () => {
  const { token }    = useParams();
  const navigate     = useNavigate();
  const { login: authLogin } = useAuth();

  const [convite,    setConvite]    = useState(null);
  const [validating, setValidating] = useState(true);
  const [invalid,    setInvalid]    = useState(false);

  // Campos do formulário
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [crfUF,     setCrfUF]     = useState('SP');
  const [crfNumber, setCrfNumber] = useState('');
  const [chavePix,  setChavePix]  = useState('');

  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/convite/${token}`);
        if (res.ok) {
          const d = await res.json();
          setConvite(d);
          setName(d.nome);
          setEmail(d.email);
        } else {
          setInvalid(true);
        }
      } catch {
        setInvalid(true);
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!/^\d{1,6}$/.test(crfNumber.trim())) {
      setErr('Número do CRF deve conter apenas dígitos (1–6 caracteres).');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/convite/${token}/registrar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, crfUF, crfNumber: crfNumber.trim(), chavePix: chavePix.trim() || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        setSuccess(true);
        if (authLogin) authLogin(d.token, d.user);
        setTimeout(() => navigate('/'), 2500);
      } else {
        setErr(d.error || 'Erro ao registrar.');
      }
    } catch {
      setErr('Falha de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Estados de carga / token inválido ──────────────────────────────────────

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-wash via-canvas to-brand-wash p-4">
        <div className="bg-canvas border border-error/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-error-wash flex items-center justify-center mx-auto mb-4">
            <Link2Off className="w-7 h-7 text-error" strokeWidth={1.75} />
          </div>
          <h1 className="font-heading font-bold text-ink text-lg mb-2">Link inválido ou expirado</h1>
          <p className="text-sm text-muted">
            Este convite não existe, já foi utilizado ou expirou (validade de 7 dias).
          </p>
          <p className="text-xs text-muted mt-4">
            Entre em contato com a equipe da FarmaConsulta para receber um novo convite.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-wash via-canvas to-brand-wash p-4">
        <div className="bg-canvas border border-success/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-success-wash flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="w-7 h-7 text-success" strokeWidth={1.75} />
          </div>
          <h1 className="font-heading font-bold text-ink text-lg mb-2">Cadastro realizado!</h1>
          <p className="text-sm text-muted">
            Seu acesso foi criado. Aguarde a aprovação do administrador para começar a atender.
          </p>
          <p className="text-xs text-muted mt-3">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // ── Formulário de registro ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-wash via-canvas to-brand-wash flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="font-heading font-extrabold text-lg">
            <span className="text-ink">Farma</span><span className="text-brand">Consulta</span>
          </p>
        </div>

        <div className="bg-canvas border border-brand/20 rounded-2xl shadow-xl shadow-brand-wash">
          <div className="px-8 pt-8 pb-4 border-b border-line">
            <h1 className="font-heading text-xl font-bold text-ink">Criar sua conta</h1>
            <p className="text-sm text-muted mt-1">
              Convite para <strong>{convite?.nome}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

            <div>
              <label htmlFor="invite-nome" className="block text-xs font-semibold text-muted mb-1">Nome completo</label>
              <div className="relative">
                <User className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="invite-nome"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full pl-10 pr-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-wash focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label htmlFor="invite-email" className="block text-xs font-semibold text-muted mb-1">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-wash focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label htmlFor="invite-senha" className="block text-xs font-semibold text-muted mb-1">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="invite-senha"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-wash focus:border-brand"
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

            <div>
              <label htmlFor="invite-crf-numero" className="block text-xs font-semibold text-muted mb-1">CRF</label>
              <div className="flex gap-2">
                <select
                  id="invite-crf-uf"
                  value={crfUF}
                  onChange={(e) => setCrfUF(e.target.value)}
                  className="border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-wash focus:border-brand"
                >
                  {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                <div className="relative flex-1">
                  <IdCard className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="invite-crf-numero"
                    type="text"
                    value={crfNumber}
                    onChange={(e) => setCrfNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="Número (ex: 12345)"
                    className="w-full pl-10 pr-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-wash focus:border-brand"
                  />
                </div>
              </div>
              <p className="text-xs text-muted mt-1">Somente os dígitos do número do CRF, sem a UF.</p>
            </div>

            <div>
              <label htmlFor="invite-pix" className="block text-xs font-semibold text-muted mb-1">
                Chave PIX <span className="font-normal text-muted">(opcional — para recebimento de repasses)</span>
              </label>
              <div className="relative">
                <Wallet className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="invite-pix"
                  type="text"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  className="w-full pl-10 pr-3 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-wash focus:border-brand"
                />
              </div>
            </div>

            {err && (
              <p role="alert" className="text-xs text-error bg-error-wash rounded-xl px-4 py-3">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand hover:bg-brand-deep text-brand-contrast font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm"
            >
              {saving ? 'Criando conta...' : 'Criar minha conta'}
            </button>

            <p className="text-xs text-muted text-center">
              Após o cadastro, um administrador revisará seu perfil antes de liberar o acesso.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteRegistro;
