import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';

const STATS = [
  { value: '500+', label: 'Consultas realizadas' },
  { value: '4.9★', label: 'Avaliação média' },
  { value: '< 5 min', label: 'Tempo de espera' },
  { value: 'PIX', label: 'Pagamento seguro' },
];

const HeroSection = () => {
  const outletCtx = useOutletContext?.() || {};

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section
      className="relative flex items-center overflow-hidden bg-slate-950"
      style={{ minHeight: '88vh' }}
    >
      {/* Background image */}
      <img
        src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000"
        alt="Farmacêutico atendendo paciente online"
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ opacity: 0.35 }}
      />

      {/* Gradient overlay — left dark, right fades */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-900/25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

      {/* Soft glow accents */}
      <div className="absolute right-1/4 top-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-10 bottom-1/4 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="max-w-3xl">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-600/15 border border-blue-500/30 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Orientação Farmacêutica Online · 100% certificado
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Tire suas dúvidas sobre{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #60A5FA 0%, #2DD4BF 100%)' }}
            >
              medicamentos
            </span>{' '}
            com farmacêuticos certificados
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl font-normal">
            Orientação farmacêutica online para dosagem infantil, sintomas leves, interações medicamentosas e uso correto de medicamentos.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link
              to="/entrar"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-8 py-4 rounded-2xl transition-all duration-150 shadow-lg text-base"
              style={{ boxShadow: '0 8px 24px -4px rgba(37,99,235,0.35)' }}
            >
              Encontrar Farmacêutico
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <button
              onClick={() => scrollTo('como-funciona')}
              className="inline-flex items-center justify-center gap-2 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-150 text-base border"
              style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            >
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Como Funciona
            </button>
            {outletCtx.onRegisterPharmacist && (
              <button
                onClick={outletCtx.onRegisterPharmacist}
                className="sm:hidden inline-flex items-center justify-center text-blue-300 font-medium text-sm underline underline-offset-4 py-2"
              >
                Sou farmacêutico
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="min-w-fit">
                <p className="text-2xl font-black text-white leading-none">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sou farmacêutico — desktop floating link */}
      {outletCtx.onRegisterPharmacist && (
        <button
          onClick={outletCtx.onRegisterPharmacist}
          className="hidden sm:flex absolute bottom-8 right-8 items-center gap-2 text-slate-400 hover:text-white text-xs transition border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl"
          style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.04)' }}
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
