import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, MessageCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Login from '../components/Login.jsx';

const BRAND_FACTS = [
  { Icon: ShieldCheck, label: 'CRF verificado manualmente' },
  { Icon: MessageCircle, label: 'Consulta pelo seu WhatsApp' },
  { Icon: FileText, label: 'Orientações por escrito ao final' },
];

const LoginPage = () => {
  const { user, needsEnvSelection } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');

  useEffect(() => {
    if (!user) return;
    navigate(needsEnvSelection ? '/selecionar-perfil' : '/dashboard', { replace: true });
  }, [user, needsEnvSelection, navigate]);

  const isRegister = mode === 'register';

  return (
    <div className="grid lg:grid-cols-2 min-h-[calc(100vh-64px)]">
      {/* Painel de marca — desktop */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-slate-950 px-12 py-16">
        <div className="absolute right-1/4 top-1/3 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-1/4 w-56 h-56 bg-brand-deep/10 rounded-full blur-3xl pointer-events-none" />

        <p className="relative font-heading font-extrabold text-2xl">
          <span className="text-white">Farma</span><span className="text-brand">Consulta</span>
        </p>

        <div className="relative max-w-md">
          <h2 className="font-heading font-extrabold text-3xl text-white leading-tight mb-4">
            Sua dúvida de saúde, respondida por quem entende de medicamento.
          </h2>
          <p className="text-slate-300 leading-relaxed mb-8">
            Consulte um farmacêutico com CRF verificado, pelo seu WhatsApp, sem precisar instalar nada.
          </p>
          <ul className="space-y-4">
            {BRAND_FACTS.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-slate-200 text-sm">
                <Icon className="w-5 h-5 text-brand shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          As consultas não substituem prescrição ou diagnóstico médico.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-gradient-to-br from-brand-wash via-canvas to-brand-wash px-4 py-12">
        <div className="w-full max-w-md">
          {/* Marca compacta — mobile */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-6">
            <span className="w-9 h-9 rounded-2xl bg-brand-wash text-brand-deep flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4.93 19.07a4.5 4.5 0 010-6.36l7.78-7.78a4.5 4.5 0 116.36 6.36l-7.78 7.78a4.5 4.5 0 01-6.36 0z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M9 8l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <p className="font-heading font-extrabold text-lg">
              <span className="text-ink">Farma</span><span className="text-brand">Consulta</span>
            </p>
          </div>

          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-extrabold text-ink">
              {isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-muted mt-2 text-sm">
              {isRegister
                ? 'Escolha como você quer usar a FarmaConsulta.'
                : 'Entre com Google ou e-mail para acessar suas consultas.'}
            </p>
          </div>

          {/* Card de login */}
          <div className="bg-surface rounded-2xl shadow-xl shadow-brand-wash border border-brand/20 p-8">
            <Login onModeChange={setMode} />
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted mt-6 leading-relaxed">
            Ao entrar, você concorda com nossos{' '}
            <span className="text-brand-deep cursor-pointer hover:underline">Termos de Uso</span>
            {' '}e{' '}
            <span className="text-brand-deep cursor-pointer hover:underline">Política de Privacidade</span>.
            <br />
            As consultas não substituem prescrição ou diagnóstico médico.
          </p>

          <div className="text-center mt-4">
            <Link to="/" className="text-sm text-muted hover:text-brand-deep transition">
              ← Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
