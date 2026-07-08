export const PRECO_CONSULTA = 50;

export const toLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
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

export const DIAS_SEMANA = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

export const fmtWhen = (iso) => {
  const dt = new Date(iso);
  const now = new Date();
  const diffMs = dt.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffMin < 60) return `em ${diffMin} min`;
  const diffDays = Math.round(
    (new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    / 86400000
  );
  if (diffDays === 0) return `hoje às ${hora}`;
  if (diffDays === 1) return `amanhã às ${hora}`;
  return `${DIAS_SEMANA[dt.getDay()]} às ${hora}`;
};

export const PARENTESCO_OPTS = [
  { value: '', label: 'Selecionar' },
  { value: 'filho_a', label: 'Filho(a)' },
  { value: 'conjuge', label: 'Cônjuge' },
  { value: 'pai_mae', label: 'Pai / Mãe' },
  { value: 'irmao_a', label: 'Irmão(ã)' },
  { value: 'outro', label: 'Outro' },
];

export const PARENTESCO_LABEL = Object.fromEntries(
  PARENTESCO_OPTS.filter(o => o.value).map(o => [o.value, o.label])
);

export const EMPTY_CADASTRO = { nome: '', dataNascimento: '', sexo: '', parentesco: '', aceito: false };

export const validarNome = (nome) => {
  const t = (nome ?? '').trim();
  if (!t) return 'Nome é obrigatório.';
  if (t.length < 5) return 'Informe o nome completo (mínimo 5 caracteres).';
  if (!/^[A-Za-zÀ-ÿ\s]+$/.test(t)) return 'Apenas letras e espaços são permitidos.';
  if (/(.)\1{3,}/iu.test(t)) return 'Informe o nome completo.';
  return '';
};

export const validarData = (data) => {
  if (!data) return 'Data de nascimento é obrigatória.';
  const nasc = new Date(data);
  if (isNaN(nasc.getTime())) return 'Data inválida.';
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (nasc >= hoje) return 'A data não pode ser hoje ou futura.';
  const limite = new Date(hoje); limite.setFullYear(limite.getFullYear() - 120);
  if (nasc < limite) return 'Idade máxima é 120 anos.';
  return '';
};
