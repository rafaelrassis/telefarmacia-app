import React from 'react';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const toLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

export const calcIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  ) idade--;
  if (idade < 0 || idade > 120) return null;
  return idade;
};

export const SINAIS_ALERTA = [
  'Falta de ar',
  'Dor intensa',
  'Sangramento',
  'Febre alta persistente',
  'Desmaio',
  'Convulsão',
  'Alteração do nível de consciência',
  'Sintomas em criança pequena, gestante ou idoso',
];

export const PARENTESCO_LABEL = {
  filho_a: 'Filho(a)',
  conjuge: 'Cônjuge',
  pai_mae: 'Pai/Mãe',
  irmao_a: 'Irmão(ã)',
  outro: 'Outro',
};

export const DEP_COLORS = [
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-indigo-400 to-blue-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-purple-500',
];

export const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

export const maskWhatsapp = (v) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

export const validarWhatsapp = (v) => {
  const digits = v.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
};

// ── Tokens compartilhados (Fase 9B.3) ───────────────────────────────────────
const fieldBase = 'w-full box-border rounded-lg px-3 py-2 text-sm text-ink outline-none bg-canvas border focus:ring-2 focus:ring-brand';
export const inp = `${fieldBase} border-line`;
export const inpError = `${fieldBase} border-error`;
export const area = `${inp} resize-y min-h-[72px]`;
export const areaError = `${inpError} resize-y min-h-[72px]`;
export const lbl = 'block text-xs font-semibold text-muted mb-1';
export const sec = 'text-[13px] font-bold text-ink mt-5 mb-3 border-b border-line pb-2';

export const Toggle = ({ value, onChange, label }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-line/60">
    <span className="text-sm text-ink">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      aria-label={label}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${value ? 'bg-brand' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  </div>
);

// Linha de pergunta Sim/Não (histórico e revisão)
export const SimNaoRow = ({ value, onChange, label }) => (
  <div className="flex justify-between items-center gap-2.5 py-2.5 border-b border-line/60">
    <span className="text-sm text-ink flex-1">{label}</span>
    <div className="flex gap-1.5 shrink-0">
      {[{ v: true, t: 'Sim' }, { v: false, t: 'Não' }].map(({ v, t }) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`px-3.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
            value === v ? 'border-brand bg-brand-wash text-brand-deep' : 'border-line bg-canvas text-muted'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  </div>
);
