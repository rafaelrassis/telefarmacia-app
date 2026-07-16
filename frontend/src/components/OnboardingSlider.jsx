import React, { useState } from 'react';
import { CalendarClock, QrCode, MessageCircle, Pill, Stethoscope, ClipboardList, Leaf, Rocket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SLIDES = [
  {
    Icon: CalendarClock,
    titulo: 'Como funciona',
    passos: [
      { Icon: CalendarClock, texto: 'Agende uma consulta com o farmacêutico disponível' },
      { Icon: QrCode, texto: 'Pague com créditos — recarga simples via PIX' },
      { Icon: MessageCircle, texto: 'Consulta pelo seu WhatsApp, de onde você estiver' },
    ],
  },
  {
    Icon: Pill,
    titulo: 'O que o farmacêutico pode fazer por você',
    passos: [
      { Icon: Pill, texto: 'Orientação sobre medicamentos e interações' },
      { Icon: Stethoscope, texto: 'Dúvidas sobre exames e resultados laboratoriais' },
      { Icon: ClipboardList, texto: 'Acompanhamento de doenças crônicas e uso contínuo' },
      { Icon: Leaf, texto: 'Orientação nutricional e suplementação' },
    ],
  },
  {
    Icon: Rocket,
    titulo: 'Vamos começar?',
    cta: true,
  },
];

const OnboardingSlider = ({ onConcluido }) => {
  const { token } = useAuth();
  const [slide,   setSlide]   = useState(0);
  const [loading, setLoading] = useState(false);

  const concluir = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/paciente/onboarding/concluir`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    await onConcluido?.();
  };

  const isLast = slide === SLIDES.length - 1;
  const s      = SLIDES[slide];
  const SlideIcon = s.Icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/55 backdrop-blur-sm">
      <div className="relative bg-canvas rounded-2xl shadow-2xl w-full max-w-[420px] max-h-[90vh] flex flex-col">
        {/* Pular */}
        <button
          onClick={concluir}
          disabled={loading}
          className="absolute top-4 right-4 z-[1] bg-transparent border-none cursor-pointer text-[13px] text-muted font-semibold px-2 py-1 rounded-md hover:text-ink transition"
        >
          Pular
        </button>

        {/* Conteúdo */}
        <div className="px-7 pt-10 pb-6 flex-1 overflow-y-auto">
          {/* Ícone grande */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-wash text-brand-deep flex items-center justify-center">
            <SlideIcon className="w-8 h-8" strokeWidth={1.75} />
          </div>

          {/* Título */}
          <h2 className="font-heading text-xl font-extrabold text-ink text-center mb-5">
            {s.titulo}
          </h2>

          {/* Passos ou CTA */}
          {s.passos && (
            <div className="flex flex-col gap-3.5">
              {s.passos.map((p, i) => {
                const PassoIcon = p.Icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-[10px] bg-brand-wash text-brand-deep shrink-0 flex items-center justify-center">
                      <PassoIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </span>
                    <p className="m-0 text-sm text-ink leading-relaxed pt-1.5">
                      {p.texto}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {s.cta && (
            <div className="text-center py-3 pb-1">
              <p className="text-[15px] text-muted leading-relaxed mb-2">
                Sua saúde merece atenção especializada.<br />
                Agende sua primeira consulta agora.
              </p>
              <p className="text-[13px] text-muted m-0">
                Disponível 24h • Sem deslocamento • Reembolso total se cancelar
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 pt-4 pb-7 border-t border-line">
          {/* Dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                style={{ width: i === slide ? 20 : 8 }}
                className={`h-2 rounded-full border-none cursor-pointer p-0 transition-all duration-200 ${
                  i === slide ? 'bg-brand' : 'bg-line'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={concluir}
              disabled={loading}
              className={`w-full py-3.5 text-white border-none rounded-xl text-[15px] font-extrabold transition-colors ${
                loading ? 'bg-brand/60 cursor-not-allowed' : 'bg-brand hover:bg-brand-deep cursor-pointer'
              }`}
            >
              {loading ? 'Carregando...' : 'Agendar minha primeira consulta'}
            </button>
          ) : (
            <button
              onClick={() => setSlide((s) => s + 1)}
              className="w-full py-3.5 bg-brand hover:bg-brand-deep text-brand-contrast border-none rounded-xl text-[15px] font-bold cursor-pointer transition-colors"
            >
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingSlider;
