import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ShieldCheck, FileText, MessageCircle, Lock } from 'lucide-react';

const FACTS = [
  { icon: ShieldCheck,   value: 'CRF verificado',    label: 'Registro checado manualmente antes de atender' },
  { icon: FileText,      value: 'Por escrito',        label: 'Orientações registradas e disponíveis para baixar' },
  { icon: MessageCircle, value: 'Pelo WhatsApp',      label: 'A consulta acontece no seu número, sem app extra' },
  { icon: Lock,          value: 'Dados protegidos',   label: 'Conexão criptografada e conformidade com a LGPD' },
];

const HeroSection = () => {
  const outletCtx = useOutletContext?.() || {};

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section
      className="relative flex items-center overflow-hidden bg-slate-950 min-h-[88vh]"
    >
      {/* Background image */}
      <img
        src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000"
        alt="Farmacêutico atendendo paciente online"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.35]"
      />

      {/* Gradient overlay — left dark, right fades */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-900/25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

      {/* Soft glow accents */}
      <div className="absolute right-1/4 top-1/3 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-10 bottom-1/4 w-56 h-56 bg-brand-deep/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="max-w-3xl">

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-heading font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Dúvida sobre medicamento?{' '}
            <br className="hidden sm:block" />
            Fale com um{' '}
            <span
              className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#3B9FE0_0%,#8ED2F6_100%)]"
            >
              farmacêutico de verdade
            </span>.
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl font-normal">
            Orientação clínica individual, por WhatsApp, com registro por escrito ao final. Agende um horário ou entre na fila urgente.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link
              to="/entrar"
              className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-deep active:bg-brand-deep text-brand-contrast font-bold px-8 py-4 rounded-2xl transition-all duration-150 text-base shadow-[0_8px_24px_-4px_rgba(59,159,224,0.35)]"
            >
              Agendar consulta
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <button
              onClick={() => scrollTo('como-funciona')}
              className="inline-flex items-center justify-center gap-2 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-150 text-base border bg-white/[0.07] border-white/[0.18] backdrop-blur-sm"
            >
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Como Funciona
            </button>
            {outletCtx.onRegisterPharmacist && (
              <button
                onClick={outletCtx.onRegisterPharmacist}
                className="sm:hidden inline-flex items-center justify-center text-brand font-medium text-sm underline underline-offset-4 py-2"
              >
                Sou farmacêutico
              </button>
            )}
          </div>

          {/* Fatos verificáveis */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl">
            {FACTS.map(({ icon: Icon, value, label }) => (
              <div key={value} className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-3.5">
                <p className="text-white font-bold text-[13px] flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-brand shrink-0" strokeWidth={1.75} />
                  {value}
                </p>
                <p className="text-slate-400 text-[11px] mt-1 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sou farmacêutico — desktop floating link */}
      {outletCtx.onRegisterPharmacist && (
        <button
          onClick={outletCtx.onRegisterPharmacist}
          className="hidden sm:flex absolute bottom-8 right-8 items-center gap-2 text-slate-400 hover:text-white text-xs transition border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl bg-white/[0.04] backdrop-blur-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Quero ser farmacêutico parceiro
        </button>
      )}
    </section>
  );
};

export default HeroSection;
