import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, CheckCircle2, TriangleAlert, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { PasswordInput } from './AlterarSenhaForm.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const inp = 'w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none transition text-center font-mono tracking-widest';

// Fluxo de ativação/desativação opcional do TOTP, no mesmo padrão visual de
// AlterarSenhaForm.jsx. Estados: 'idle' (espelha user.totpEnabled),
// 'setup' (QR + backup codes gerados, aguardando código de confirmação) e
// 'disable' (aguardando senha ou código para desligar).
const TotpSetupForm = () => {
  const { user, token, refreshUser } = useAuth();
  const hasPassword = Boolean(user?.hasPassword);
  const totpEnabled = Boolean(user?.totpEnabled);

  const [step, setStep] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [confirmCode, setConfirmCode] = useState('');
  const [copied, setCopied] = useState(false);

  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    if (!otpauthUrl) { setQrDataUrl(''); return; }
    QRCode.toDataURL(otpauthUrl, { width: 200, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [otpauthUrl]);

  const resetMsg = () => { setMsg(''); setMsgType(''); };

  const startSetup = async () => {
    resetMsg();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/totp/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsgType('error');
        setMsg(data.error || 'Erro ao iniciar configuração.');
        return;
      }
      setOtpauthUrl(data.otpauthUrl);
      setBackupCodes(data.backupCodes || []);
      setStep('setup');
    } catch {
      setMsgType('error');
      setMsg('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async (e) => {
    e.preventDefault();
    resetMsg();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/totp/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: confirmCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsgType('error');
        setMsg(data.error || 'Código inválido.');
        return;
      }
      await refreshUser();
      setStep('idle');
      setOtpauthUrl('');
      setConfirmCode('');
      setMsgType('success');
      setMsg('Autenticação em duas etapas ativada com sucesso!');
    } catch {
      setMsgType('error');
      setMsg('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async (e) => {
    e.preventDefault();
    resetMsg();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/totp/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          password: hasPassword ? disablePassword : undefined,
          code: disableCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsgType('error');
        setMsg(data.error || 'Erro ao desativar.');
        return;
      }
      await refreshUser();
      setStep('idle');
      setDisablePassword('');
      setDisableCode('');
      setBackupCodes([]);
      setMsgType('success');
      setMsg('Autenticação em duas etapas desativada.');
    } catch {
      setMsgType('error');
      setMsg('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const cancelSetup = () => {
    setStep('idle');
    setOtpauthUrl('');
    setBackupCodes([]);
    setConfirmCode('');
    resetMsg();
  };

  const copyBackupCodes = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 bg-surface border border-line rounded-[10px] px-3 py-2.5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink m-0">Autenticação em duas etapas</p>
            <p className="text-xs text-muted m-0">
              {totpEnabled ? 'Ativada — um código do seu app autenticador é exigido no login.' : 'Desativada — ative para uma camada extra de segurança.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={totpEnabled}
          onClick={() => {
            resetMsg();
            if (step !== 'idle') { cancelSetup(); return; }
            if (totpEnabled) { setStep('disable'); return; }
            startSetup();
          }}
          disabled={loading}
          className={`shrink-0 w-11 h-6 rounded-full transition relative disabled:opacity-50 ${totpEnabled ? 'bg-brand' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${totpEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {step === 'setup' && (
        <div className="border border-line rounded-[10px] p-3 space-y-3">
          <p className="text-xs text-muted">
            Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, etc.) e digite o código gerado para confirmar.
          </p>
          {qrDataUrl && (
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="QR code para configurar autenticação em duas etapas" className="rounded-lg border border-line" width={200} height={200} />
            </div>
          )}

          <div className="bg-alert-wash border border-alert/30 rounded-md px-2.5 py-2">
            <p className="text-[11px] text-alert font-semibold m-0 mb-1 inline-flex items-center gap-1">
              <TriangleAlert className="w-3 h-3 shrink-0" />
              Guarde estes códigos de backup — cada um funciona uma única vez e eles não serão mostrados de novo.
            </p>
            <div className="grid grid-cols-2 gap-1 font-mono text-xs text-ink">
              {backupCodes.map((c) => <span key={c}>{c}</span>)}
            </div>
            <button
              type="button"
              onClick={copyBackupCodes}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-deep hover:underline"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : 'Copiar códigos'}
            </button>
          </div>

          <form onSubmit={confirmEnable} className="space-y-2">
            <label htmlFor="totp-setup-confirm" className="block text-xs font-semibold text-muted">Código de confirmação</label>
            <input
              id="totp-setup-confirm"
              type="text"
              placeholder="000000"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              autoComplete="one-time-code"
              required
              className={inp}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelSetup}
                className="flex-1 py-2 border border-line rounded-xl text-sm font-semibold text-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !confirmCode.trim()}
                className="flex-1 py-2 bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
              >
                {loading ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'disable' && (
        <form onSubmit={confirmDisable} className="border border-line rounded-[10px] p-3 space-y-3">
          <p className="text-xs text-muted">
            Para desativar, confirme com sua senha atual{hasPassword ? '' : ' (sua conta usa login com Google)'} ou um código do app autenticador.
          </p>
          {hasPassword && (
            <PasswordInput
              id="totp-disable-senha"
              label="Senha atual"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              autoComplete="current-password"
            />
          )}
          <div>
            <label htmlFor="totp-disable-code" className="block text-xs font-semibold text-muted mb-1">
              {hasPassword ? 'Ou código de 6 dígitos' : 'Código de 6 dígitos'}
            </label>
            <input
              id="totp-disable-code"
              type="text"
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              autoComplete="one-time-code"
              className={inp}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelSetup}
              className="flex-1 py-2 border border-line rounded-xl text-sm font-semibold text-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (!disablePassword.trim() && !disableCode.trim())}
              className="flex-1 py-2 bg-error hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
            >
              {loading ? 'Desativando...' : 'Desativar'}
            </button>
          </div>
        </form>
      )}

      {msg && (
        <p className={`text-xs font-medium inline-flex items-center gap-1.5 ${msgType === 'success' ? 'text-success' : 'text-error'}`}>
          {msgType === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TriangleAlert className="w-3.5 h-3.5" />}
          {msg}
        </p>
      )}
    </div>
  );
};

export default TotpSetupForm;
