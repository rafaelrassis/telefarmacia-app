import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    q: 'O que é um farmacêutico clínico?',
    a: 'O farmacêutico clínico é um profissional especializado em orientar o uso correto de medicamentos, avaliar interações, ajustar doses e acompanhar pacientes com doenças crônicas. Diferente do farmacêutico de balcão, ele realiza consultas individualizadas e personalizadas.',
  },
  {
    q: 'Quais tipos de dúvidas posso tirar?',
    a: 'Você pode tirar dúvidas sobre Medicamentos Isentos de Prescrição (MIPs), como analgésicos, antitérmicos e antigripais. Também orientamos sobre interações medicamentosas, dosagem por peso para crianças, cuidados com uso crônico e suplementação.',
  },
  {
    q: 'As consultas substituem a ida ao médico?',
    a: 'Não. As consultas do FarmaConsulta são orientações farmacêuticas complementares. Não prescrevemos medicamentos e não substituímos o diagnóstico médico. Em casos que exijam prescrição, sempre indicamos a consulta com um médico.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'O pagamento é feito via PIX. Após escolher data e horário, você recebe um QR Code ou código Copia e Cola. Assim que o pagamento é confirmado, sua consulta entra na fila e um farmacêutico entra em contato com você pelo WhatsApp no horário combinado.',
  },
  {
    q: 'Posso cancelar uma consulta agendada?',
    a: 'Sim. Você pode cancelar diretamente pela plataforma em "Minhas Consultas". Para reembolso, entre em contato com o suporte com pelo menos 2 horas de antecedência.',
  },
  {
    q: 'Como sei que os farmacêuticos são confiáveis?',
    a: 'Todos os farmacêuticos passam por verificação manual do CRF (Conselho Regional de Farmácia) antes de serem aprovados na plataforma. Apenas profissionais com registro ativo e verificado aparecem para os pacientes.',
  },
  {
    q: 'Como acontece a consulta?',
    a: 'Pelo WhatsApp, no número que você informar na triagem. No horário agendado (ou em minutos, no atendimento urgente), um farmacêutico verificado inicia a conversa com você. Ao final, você recebe as orientações por escrito na plataforma.',
  },
];

const ChevronIcon = ({ open }) => (
  <svg
    className="w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300"
    style={{ transform: open ? 'rotate(180deg)' : 'none' }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const FAQSection = () => {
  const [open, setOpen] = useState(null);

  return (
    <section id="faq" className="bg-white border-t border-slate-200 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold text-brand-deep uppercase tracking-[0.12em] mb-3">FAQ</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ainda tem dúvidas?
          </h2>
          <p className="text-slate-500 text-sm mt-2">Encontre respostas para as perguntas mais comuns.</p>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`border rounded-2xl overflow-hidden transition-colors duration-200 ${isOpen ? 'border-brand/40 bg-brand-wash/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                >
                  <span className={`text-sm font-semibold leading-snug transition-colors ${isOpen ? 'text-brand-deep' : 'text-slate-700'}`}>
                    {faq.q}
                  </span>
                  <ChevronIcon open={isOpen} />
                </button>

                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: isOpen ? '300px' : '0px' }}
                >
                  <div className="px-5 pb-5">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500 mb-3">Não encontrou o que procurava?</p>
          <Link
            to="/entrar"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-sm shadow-brand-wash"
          >
            Falar com um farmacêutico agora
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
