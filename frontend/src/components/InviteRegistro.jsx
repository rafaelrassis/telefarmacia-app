import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="font-bold text-gray-900 text-lg mb-2">Link inválido ou expirado</h1>
          <p className="text-sm text-gray-500">
            Este convite não existe, já foi utilizado ou expirou (validade de 7 dias).
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Entre em contato com a equipe da Telefarmácia para receber um novo convite.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border border-green-200 rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="font-bold text-gray-900 text-lg mb-2">Cadastro realizado!</h1>
          <p className="text-sm text-gray-500">
            Seu acesso foi criado. Aguarde a aprovação do administrador para começar a atender.
          </p>
          <p className="text-xs text-gray-400 mt-3">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // ── Formulário de registro ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-md">

        <div className="px-8 pt-8 pb-4 border-b border-gray-100">
          <p className="text-violet-700 font-bold text-sm uppercase tracking-widest mb-1">Telefarmácia</p>
          <h1 className="text-xl font-bold text-gray-900">Criar sua conta</h1>
          <p className="text-sm text-gray-500 mt-1">
            Convite para <strong>{convite?.nome}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">CRF</label>
            <div className="flex gap-2">
              <select
                value={crfUF}
                onChange={(e) => setCrfUF(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
              <input
                type="text"
                value={crfNumber}
                onChange={(e) => setCrfNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="Número (ex: 12345)"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Somente os dígitos do número do CRF, sem a UF.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Chave PIX <span className="font-normal text-gray-400">(opcional — para recebimento de repasses)</span>
            </label>
            <input
              type="text"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-violet-700 hover:bg-violet-800 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm"
          >
            {saving ? 'Criando conta...' : 'Criar minha conta'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Após o cadastro, um administrador revisará seu perfil antes de liberar o acesso.
          </p>
        </form>
      </div>
    </div>
  );
};

export default InviteRegistro;
