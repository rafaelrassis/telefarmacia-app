import React from 'react';

const STATS = [
  { value: '500+', label: 'Consultas realizadas' },
  { value: '4.9', label: 'Avaliação média' },
  { value: '98%', label: 'Pacientes satisfeitos' },
  { value: '< 5min', label: 'Tempo de espera' },
];

const TESTIMONIALS = [
  {
    name: 'Ana Paula S.',
    role: 'Mãe de dois filhos',
    text: 'Meu filho tinha febre e não sabia a dose correta de dipirona para o peso dele. Em 10 minutos já estava na chamada com a farmacêutica. Incrível!',
  },
  {
    name: 'Carlos M.',
    role: 'Paciente crônico',
    text: 'Uso 5 medicamentos diferentes e sempre fiquei com medo de interações. A consulta me deu segurança total sobre o que posso ou não misturar.',
  },
  {
    name: 'Fernanda L.',
    role: 'Professora',
    text: 'Prático demais! Paguei pelo PIX, recebi o link e 20 minutos depois já tinha a orientação que precisava. Recomendo para toda a família.',
  },
];

const Testimonials = () => (
  <section className="py-20 bg-gray-50">
    <div className="max-w-5xl mx-auto px-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl sm:text-4xl font-extrabold text-violet-700">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-3">Depoimentos</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
          O que nossos pacientes dizem
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, j) => (
                <span key={j} className="text-orange-400 text-sm">★</span>
              ))}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
              <p className="text-xs text-gray-400">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
