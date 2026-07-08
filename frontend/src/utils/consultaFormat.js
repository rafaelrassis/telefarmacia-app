export const STATUS_LABELS = {
  aguardando:     { label: 'Aguardando farmacêutico', cls: 'text-gray-600 bg-gray-100' },
  aceito:         { label: 'Confirmado',              cls: 'text-blue-700 bg-blue-100' },
  em_atendimento: { label: 'Em atendimento',          cls: 'text-green-700 bg-green-100' },
  concluido:      { label: 'Concluído',               cls: 'text-teal-700 bg-teal-100' },
  cancelado:      { label: 'Cancelado',               cls: 'text-red-700 bg-red-100' },
};

export const fmtElapsed = (s) => {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}h ` : ''}${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
};

export const emptyMed = () => ({ medicamento: '', dosagem: '', posologia: '', duracao: '' });

export const truncate = (text, max = 80) => {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}...`;
};

export const SINAIS_LABEL = {
  queixa_principal: 'Queixa principal',
  tempo_sintomas: 'Duração dos sintomas',
  evolucao_sintomas: 'Evolução dos sintomas',
  localizacao: 'Localização',
  outros_sintomas: 'Outros sintomas',
  qual_doenca: 'Doença crônica',
  quais_medicamentos: 'Medicamentos em uso',
  quais_alergias: 'Alergias a medicamentos',
  quais_outras_alergias: 'Outras alergias',
  temperatura: 'Temperatura',
};

export const RELACAO_LABEL = { filho_a: 'filho(a)', conjuge: 'cônjuge', pai_mae: 'pai/mãe', outro: 'outro' };

export const RADIO_LABELS = {
  problema_autolimitado: { sim: 'Sim', nao: 'Não', indeterminado: 'Indeterminado' },
  paciente_compreendeu:  { sim: 'Sim', parcialmente: 'Parcialmente', nao: 'Não' },
  contraindicacao:       { sim: 'Sim', nao: 'Não', nao_se_aplica: 'Não se aplica' },
  encaminhamento_medico: { sim: 'Sim', nao: 'Não' },
};
