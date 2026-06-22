import React from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    number: '01',
    icon: '🔍',
    title: 'Escolha seu farmacêutico',
    description: 'Filtre por especialidade — dosagem infantil, interação medicamentosa, sintomas leves e mais. Veja perfil, bio e horários.',
  },
  {
    number: '02',
    icon: '💳',
    title: 'Pague com PIX',
    description: 'Garanta seu horário com pagamento instantâneo via PIX. Rápido, seguro e sem taxas escondidas. Confirmação imediata.',
  },
  {
    number: '03',
    icon: '🎥',
    title: 'Entre na videochamada',
    description: 'Receba o link do Google Meet por e-mail. Na hora marcada, entre na chamada e receba orientação farmacêutica personalizada.',
  },
];

const HowItWorks = () => (
  <section id="como-funciona" className="py-20 bg-white">
    <div className="max-w-5xl mx-auto px-6">
      <div className="text-center mb-14">
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-3">Simples e rápido</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
          Como funciona?
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Do agendamento à consulta em 3 passos. Tudo online, sem sair de casa.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-14">
        {STEPS.map((step, i) => (
          <div key={i} className="relative">
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gray-100 -translate-x-4 z-0" />
            )}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center text-lg font-bold text-sm">
                  {step.number}
                </span>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          to="/entrar"
          className="inline-flex items-center gap-2 bg-violet-700 hover:bg-violet-800 text-white font-bold px-7 py-3 rounded-xl transition text-sm"
        >
          Começar agora →
        </Link>
      </div>
    </div>
  </section>
);

export default HowItWorks;
