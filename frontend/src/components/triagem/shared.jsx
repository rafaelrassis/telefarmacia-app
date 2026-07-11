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

// ── Estilos inline compartilhados (fase B1 — decomposição sem restyle;
//    migram para tokens Tailwind na fase B3) ────────────────────────────────
export const inp = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '8px 12px', fontSize: 14, color: '#111827',
  fontFamily: 'inherit', outline: 'none', background: 'white',
};
export const area = { ...inp, resize: 'vertical', minHeight: 72 };
export const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 };
export const sec = {
  fontSize: 13, fontWeight: 700, color: '#374151',
  margin: '20px 0 12px', borderBottom: '1px solid #f3f4f6', paddingBottom: 8,
};

export const Toggle = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
    <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? '#3B9FE0' : '#d1d5db',
        border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        transition: 'left 0.15s',
      }} />
    </button>
  </div>
);

export const Slider = ({ value, onChange, label }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={lbl}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#3B9FE0' }}>{value}/10</span>
    </div>
    <input
      type="range" min={0} max={10} value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      style={{ width: '100%', accentColor: '#3B9FE0' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
      <span>Sem desconforto</span>
      <span>Insuportável</span>
    </div>
  </div>
);
