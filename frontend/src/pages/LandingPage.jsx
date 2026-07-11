import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import HeroSection from '../components/home/HeroCarousel.jsx';
import FAQSection from '../components/home/FAQSection.jsx';
import Footer from '../components/home/Footer.jsx';

/* ─────────────────────────────────────────────────────────────
   TRUST BAR
───────────────────────────────────────────────────────────── */
const TRUST = [
  { icon: '🛡️', color: 'bg-blue-50 text-blue-600',     label: 'CRF Validado',       sub: 'Registro ativo no Conselho' },
  { icon: '🔐', color: 'bg-emerald-50 text-emerald-600', label: 'Dados Seguros',      sub: 'Conexão criptografada e LGPD' },
  { icon: '⚡', color: 'bg-amber-50 text-amber-600',    label: 'Pagamento via PIX',  sub: 'Simples e sem taxas surpresa' },
  { icon: '💬', color: 'bg-purple-50 text-purple-600',  label: 'Contato Direto',     sub: 'Farmacêutico fala com você' },
  { icon: '🌐', color: 'bg-teal-50 text-teal-600',      label: '100% Online',        sub: 'De qualquer lugar' },
];

const TrustBar = () => (
  <section className="bg-white border-y border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
        {TRUST.map(({ icon, color, label, sub }) => (
          <div key={label} className="group flex items-center gap-3">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform duration-200`}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─────────────────────────────────────────────────────────────
   SEARCH BAR
───────────────────────────────────────────────────────────── */
const PLACEHOLDERS = [
  'Dosagem de paracetamol para criança de 8kg…',
  'Ibuprofeno e amoxicilina juntos é seguro?…',
  'Febre de 38,5 em bebê de 6 meses…',
  'Dor de cabeça sem passar com analgésico…',
  'Sintomas de gripe, o que posso tomar?…',
  'Quando trocar de protetor solar oral?…',
];

const QUICK_TAGS = [
  { label: '👶 Dosagem infantil', },
  { label: '🤒 Febre', },
  { label: '💊 Interação', },
  { label: '🤕 Dor', },
  { label: '🤧 Gripe', },
];

const SearchSection = () => {
  const [phIdx, setPhIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [value, setValue] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setPhIdx((i) => (i + 1) % PLACEHOLDERS.length); setVisible(true); }, 380);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="py-14 bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-[11px] font-bold text-brand-deep uppercase tracking-[0.12em] mb-2">Busca rápida</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 mb-8 tracking-tight">
          Como podemos ajudar você hoje?
        </h2>

        {/* Search box */}
        <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-lg shadow-slate-100/80 hover:shadow-xl hover:border-brand/40 transition-shadow duration-300">
          <div className="flex-1 relative flex items-center">
            <svg className="absolute left-4 w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base text-slate-800 bg-transparent outline-none"
              placeholder=""
              aria-label="Agendar consulta"
            />
            {!value && (
              <span
                className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 text-sm sm:text-base pointer-events-none select-none whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ maxWidth: 'calc(100% - 48px)', transition: 'opacity 0.35s', opacity: visible ? 1 : 0 }}
              >
                {PLACEHOLDERS[phIdx]}
              </span>
            )}
          </div>
          <Link
            to="/entrar"
            className="shrink-0 bg-brand hover:bg-brand-deep text-white font-bold px-5 py-3 rounded-xl transition text-sm"
          >
            Agendar Consulta
          </Link>
        </div>

        {/* Quick tags */}
        <div className="flex flex-wrap gap-2 justify-center mt-5">
          {QUICK_TAGS.map(({ label }) => (
            <Link
              key={label}
              to="/entrar"
              className="text-xs text-slate-600 bg-white border border-slate-200 hover:border-brand/50 hover:text-brand-deep hover:bg-brand-wash px-3.5 py-1.5 rounded-full transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   ESPECIALIDADES
───────────────────────────────────────────────────────────── */
const SPECS = [
  { icon: '👶', label: 'Dosagem Infantil',   desc: 'Dose segura por peso e idade para bebês e crianças.',              grad: 'from-amber-50 to-orange-50',   iconCls: 'bg-amber-100 text-amber-700',   border: 'hover:border-amber-200 hover:shadow-amber-100/60' },
  { icon: '🤧', label: 'Gripe e Resfriado',  desc: 'Medicamentos e cuidados para sintomas gripais sem prescrição.',    grad: 'from-sky-50 to-blue-50',        iconCls: 'bg-sky-100 text-sky-700',       border: 'hover:border-sky-200 hover:shadow-sky-100/60' },
  { icon: '🤒', label: 'Febre',              desc: 'Quando medicar, qual antitérmico usar e qual dose é segura.',       grad: 'from-red-50 to-rose-50',        iconCls: 'bg-red-100 text-red-700',       border: 'hover:border-red-200 hover:shadow-red-100/60' },
  { icon: '🤕', label: 'Dor',               desc: 'Analgésicos, anti-inflamatórios e cuidados para cada tipo de dor.', grad: 'from-rose-50 to-pink-50',       iconCls: 'bg-rose-100 text-rose-700',     border: 'hover:border-rose-200 hover:shadow-rose-100/60' },
  { icon: '💊', label: 'Medicamentos',       desc: 'Interações, horários, efeitos colaterais e substituições.',         grad: 'from-blue-50 to-indigo-50',     iconCls: 'bg-blue-100 text-blue-700',     border: 'hover:border-blue-200 hover:shadow-blue-100/60' },
  { icon: '🩺', label: 'Sintomas Leves',     desc: 'Avaliação de sintomas comuns e orientação sobre MIPs disponíveis.', grad: 'from-teal-50 to-emerald-50',    iconCls: 'bg-teal-100 text-teal-700',     border: 'hover:border-teal-200 hover:shadow-teal-100/60' },
];

const SpecialtiesSection = () => (
  <section id="especialidades" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="text-center mb-12">
      <p className="text-[11px] font-bold text-brand-deep uppercase tracking-[0.12em] mb-3">Especialidades</p>
      <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">O que você quer resolver?</h2>
      <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
        Escolha o tema da sua dúvida — um farmacêutico verificado assume sua consulta.
      </p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {SPECS.map(({ icon, label, desc, grad, iconCls, border }) => (
        <Link
          key={label}
          to="/entrar"
          className={`group bg-gradient-to-br ${grad} border border-slate-200 ${border} rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
          style={{ minHeight: '180px' }}
        >
          <div className={`w-14 h-14 ${iconCls} rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200 shrink-0`}>
            {icon}
          </div>
          <div>
            <h3 className="font-heading font-bold text-slate-900 text-base mb-1.5">{label}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

/* ─────────────────────────────────────────────────────────────
   COMO FUNCIONA — 4 passos
───────────────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, icon: '🔍', color: 'bg-blue-600', shadow: 'shadow-blue-200',   title: 'Escolha data e horário', desc: 'Selecione o dia e horário disponíveis dentro do funcionamento da plataforma.' },
  { n: 2, icon: '💳', color: 'bg-teal-600', shadow: 'shadow-teal-200',   title: 'Agende e pague via PIX', desc: 'Pagamento 100% seguro via PIX. Confirmação instantânea, sem taxas surpresa.' },
  { n: 3, icon: '💬', color: 'bg-indigo-600', shadow: 'shadow-indigo-200', title: 'Farmacêutico entra em contato', desc: 'Um farmacêutico disponível aceita sua consulta e fala com você no horário combinado.' },
  { n: 4, icon: '📝', color: 'bg-emerald-600', shadow: 'shadow-emerald-200', title: 'Receba sua orientação', desc: 'Consulte-se e receba orientações personalizadas registradas por escrito.' },
];

const HowItWorksSection = () => (
  <section id="como-funciona" className="bg-slate-100 border-y border-slate-200 py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-14">
        <p className="text-[11px] font-bold text-brand-deep uppercase tracking-[0.12em] mb-3">Passo a passo</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Como funciona?</h2>
        <p className="text-slate-500 text-sm mt-2">Do primeiro acesso à orientação em menos de 30 minutos.</p>
      </div>

      <div className="relative">
        {/* Connecting line — desktop */}
        <div
          className="hidden lg:block absolute h-0.5 bg-slate-300 z-0"
          style={{ top: '28px', left: 'calc(12.5% + 28px)', right: 'calc(12.5% + 28px)' }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
          {STEPS.map(({ n, icon, color, shadow, title, desc }) => (
            <div key={n} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/70 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 ${color} text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${shadow} shrink-0`}>
                  {n}
                </div>
                <span className="text-2xl">{icon}</span>
              </div>
              <h4 className="font-heading font-bold text-slate-900 mb-2 leading-tight">{title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ─────────────────────────────────────────────────────────────
   DEPOIMENTOS
───────────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    avatar: 'MS', color: 'from-pink-500 to-rose-500', name: 'Mariana S.', loc: 'São Paulo, SP',
    text: 'Minha filha estava com febre e eu não sabia qual antitérmico usar com o peso dela. Em 10 minutos o farmacêutico me explicou tudo com a dose certinha. Serviço excelente!',
  },
  {
    avatar: 'CR', color: 'from-blue-500 to-indigo-500', name: 'Carlos R.', loc: 'Belo Horizonte, MG',
    text: 'Tomava 3 medicamentos diferentes e fiquei preocupado com interações. O profissional me esclareceu tudo de forma clara e ainda me indicou o horário correto para cada um.',
  },
  {
    avatar: 'FL', color: 'from-emerald-500 to-teal-500', name: 'Fernanda L.', loc: 'Rio de Janeiro, RJ',
    text: 'Atendimento rápido e muito profissional. O farmacêutico foi super paciente e me deu orientações por escrito no final. Muito mais prático do que ir a uma farmácia.',
  },
];

const Stars = () => (
  <div className="flex gap-0.5 text-amber-400">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const TestimonialsSection = () => {
  const [current, setCurrent] = useState(0);

  return (
    <section className="bg-white py-16 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold text-brand-deep uppercase tracking-[0.12em] mb-3">Depoimentos</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            O que dizem nossos pacientes
          </h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Stars />
            <span className="text-sm font-bold text-slate-700">4.9</span>
            <span className="text-sm text-slate-400">· +500 avaliações</span>
          </div>
        </div>

        {/* Desktop: 3 cols */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ avatar, color, name, loc, text }) => (
            <div key={name} className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow duration-200 flex flex-col">
              <Stars />
              <p className="text-sm text-slate-700 leading-relaxed italic mt-4 mb-6 flex-1">"{text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} text-white font-bold text-sm flex items-center justify-center shrink-0`}>
                  {avatar}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{name}</p>
                  <p className="text-xs text-slate-500">{loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="md:hidden">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6">
            <Stars />
            <p className="text-sm text-slate-700 leading-relaxed italic mt-4 mb-6">"{TESTIMONIALS[current].text}"</p>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${TESTIMONIALS[current].color} text-white font-bold text-sm flex items-center justify-center shrink-0`}>
                {TESTIMONIALS[current].avatar}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{TESTIMONIALS[current].name}</p>
                <p className="text-xs text-slate-500">{TESTIMONIALS[current].loc}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'bg-brand w-8' : 'bg-slate-300 w-2'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   CTA FINAL
───────────────────────────────────────────────────────────── */
const CTASection = () => {
  const ctx = useOutletContext?.() || {};
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div
        className="relative overflow-hidden rounded-3xl text-white text-center flex items-center justify-center"
        style={{
          minHeight: '240px',
          background: 'linear-gradient(135deg, #123F63 0%, #1D74B8 55%, #2E86D6 100%)',
          boxShadow: '0 20px 60px -10px rgba(29,116,184,0.4)',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute right-1/3 top-0 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />

        <div className="relative z-10 px-6 py-12 max-w-xl mx-auto">
          <p className="text-brand-wash text-[11px] font-bold uppercase tracking-[0.12em] mb-3">Atendimento online</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            Precisa de orientação agora?
          </h2>
          <p className="text-brand-wash text-sm mb-8 leading-relaxed">
            Encontre um farmacêutico disponível e agende sua consulta online de forma simples, rápida e segura.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/entrar"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-deep hover:bg-slate-50 font-bold px-7 py-3.5 rounded-xl text-sm transition shadow-lg"
            >
              Encontrar Farmacêutico
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            {ctx.onRegisterPharmacist && (
              <button
                onClick={ctx.onRegisterPharmacist}
                className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl text-sm transition border"
                style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}
              >
                Sou farmacêutico
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
const LandingPage = () => (
  <div className="bg-[#F8FAFC]">
    <HeroSection />
    <TrustBar />
    <SearchSection />
    <SpecialtiesSection />
    <HowItWorksSection />
    <TestimonialsSection />
    <CTASection />
    <FAQSection />
  </div>
);

export default LandingPage;
