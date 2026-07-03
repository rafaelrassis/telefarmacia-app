import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SLIDES = [
  {
    emoji: '📅',
    titulo: 'Como funciona',
    passos: [
      { icon: '📅', texto: 'Agende uma consulta com o farmacêutico disponível' },
      { icon: '💳', texto: 'Pague com créditos — recarga simples via PIX' },
      { icon: '🎥', texto: 'Consulta por vídeo, de onde você estiver' },
    ],
  },
  {
    emoji: '💊',
    titulo: 'O que o farmacêutico pode fazer por você',
    passos: [
      { icon: '💊', texto: 'Orientação sobre medicamentos e interações' },
      { icon: '🩺', texto: 'Dúvidas sobre exames e resultados laboratoriais' },
      { icon: '📋', texto: 'Acompanhamento de doenças crônicas e uso contínuo' },
      { icon: '🌿', texto: 'Orientação nutricional e suplementação' },
    ],
  },
  {
    emoji: '🚀',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 420, maxHeight: '90vh' }}
      >
        {/* Pular */}
        <button
          onClick={concluir}
          disabled={loading}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#9ca3af', fontWeight: 600, padding: '4px 8px',
            borderRadius: 6, zIndex: 1,
          }}
        >
          Pular
        </button>

        {/* Conteúdo */}
        <div style={{ padding: '40px 28px 24px', flex: 1, overflowY: 'auto' }}>
          {/* Emoji grande */}
          <div style={{ fontSize: 52, textAlign: 'center', marginBottom: 16, lineHeight: 1 }}>
            {s.emoji}
          </div>

          {/* Título */}
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', textAlign: 'center', margin: '0 0 20px' }}>
            {s.titulo}
          </h2>

          {/* Passos ou CTA */}
          {s.passos && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {s.passos.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#f5f3ff', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>
                    {p.icon}
                  </span>
                  <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.5, paddingTop: 7 }}>
                    {p.texto}
                  </p>
                </div>
              ))}
            </div>
          )}

          {s.cta && (
            <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
              <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, marginBottom: 8 }}>
                Sua saúde merece atenção especializada.<br />
                Agende sua primeira consulta agora.
              </p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                Disponível 24h • Sem deslocamento • Reembolso total se cancelar
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 28px', borderTop: '1px solid #f3f4f6' }}>
          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                style={{
                  width: i === slide ? 20 : 8, height: 8, borderRadius: 4,
                  background: i === slide ? '#7c3aed' : '#e5e7eb',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'width 0.2s, background 0.2s',
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={concluir}
              disabled={loading}
              style={{
                width: '100%', padding: '14px 0',
                background: loading ? '#a78bfa' : '#7c3aed',
                color: 'white', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Carregando...' : '🚀 Agendar minha primeira consulta'}
            </button>
          ) : (
            <button
              onClick={() => setSlide((s) => s + 1)}
              style={{
                width: '100%', padding: '14px 0',
                background: '#2563eb', color: 'white',
                border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
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
