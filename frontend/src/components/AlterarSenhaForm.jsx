import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const inp = 'w-full border border-line rounded-xl px-3 py-2.5 pr-10 text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none transition';
const lbl = 'block text-xs font-semibold text-muted mb-1';

// Heurística simples de força — comprimento pesa mais do que variedade de
// caracteres (não exigimos símbolos/maiúsculas, ver spec-alterar-recuperar-senha).
export const strengthOf = (senha) => {
  if (!senha) return null;
  let score = 0;
  if (senha.length >= 8) score++;
  if (senha.length >= 12) score++;
  if (senha.length >= 16) score++;
  if (/[0-9]/.test(senha) && /[a-zA-Z]/.test(senha)) score++;
  if (score <= 1) return 'fraca';
  if (score <= 2) return 'media';
  return 'forte';
};

export const STRENGTH_STYLE = {
  fraca: { label: 'Fraca', barClass: 'bg-error w-1/3', textClass: 'text-error' },
  media: { label: 'Média', barClass: 'bg-alert w-2/3', textClass: 'text-alert' },
  forte: { label: 'Forte', barClass: 'bg-success w-full', textClass: 'text-success' },
};

export const PasswordInput = ({ id, label, value, onChange, autoComplete, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={lbl}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={inp}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// Fluxo 1 (Alterar senha) e Fluxo 3 (Definir senha) — mesmo formulário e
// mesmo endpoint; `hasPassword` decide se o campo "senha atual" aparece.
const AlterarSenhaForm = () => {
  const { user, token, updateSession } = useAuth();
  const hasPassword = Boolean(user?.hasPassword);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  const strength = strengthOf(novaSenha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setMsgType('');

    if (novaSenha !== confirmarSenha) {
      setMsgType('error');
      setMsg('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/conta/alterar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ senhaAtual: hasPassword ? senhaAtual : undefined, novaSenha, confirmarSenha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsgType('error');
        setMsg(data.error || 'Erro ao salvar.');
        return;
      }
      updateSession(data.token, data.user);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMsgType('success');
      setMsg(hasPassword ? 'Senha alterada com sucesso!' : 'Senha definida com sucesso!');
    } catch {
      setMsgType('error');
      setMsg('Falha de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!hasPassword && (
        <p className="text-xs text-muted bg-surface border border-line rounded-lg px-3 py-2 leading-relaxed">
          Sua conta usa login com Google. Defina uma senha para também poder entrar com e-mail e senha.
        </p>
      )}

      {hasPassword && (
        <PasswordInput
          id="seguranca-senha-atual"
          label="Senha atual"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          autoComplete="current-password"
        />
      )}

      <PasswordInput
        id="seguranca-nova-senha"
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
        id="seguranca-confirmar-senha"
        label="Confirmar nova senha"
        value={confirmarSenha}
        onChange={(e) => setConfirmarSenha(e.target.value)}
        autoComplete="new-password"
      />

      {msg && (
        <p className={`text-xs font-medium inline-flex items-center gap-1.5 ${msgType === 'success' ? 'text-success' : 'text-error'}`}>
          {msgType === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
          {msg}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !novaSenha || !confirmarSenha || (hasPassword && !senhaAtual)}
        className="w-full py-2.5 bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold rounded-xl transition text-sm inline-flex items-center justify-center gap-2"
      >
        <Lock className="w-4 h-4" />
        {saving ? 'Salvando...' : hasPassword ? 'Alterar senha' : 'Definir senha'}
      </button>
    </form>
  );
};

export default AlterarSenhaForm;
