import React from 'react';
import { formatIdade } from '../../utils/formatIdade.js';
import { SINAIS_LABEL, RELACAO_LABEL } from '../../utils/consultaFormat';

const GROUP_TITLES = {
  identificacao: 'Identificação',
  sintomas: 'Sintomas',
  historico: 'Histórico',
};

const TriagemDisplay = ({ triagem, solicitanteNome }) => {
  const rows = [];

  if (triagem.para_quem) {
    // Formato legado (para_quem presente)
    const nome = triagem.paciente_nome || '—';
    const idadeStr = triagem.paciente_data_nascimento
      ? `, ${formatIdade(triagem.paciente_data_nascimento)}`
      : triagem.paciente_idade != null ? `, ${triagem.paciente_idade} anos` : '';
    const relStr = triagem.paciente_relacao ? ` (${RELACAO_LABEL[triagem.paciente_relacao] || triagem.paciente_relacao})` : '';
    if (triagem.para_quem === 'eu') {
      rows.push({ label: 'Consulta para', value: `${nome} (para si mesmo)`, group: 'identificacao' });
    } else {
      const sol = solicitanteNome ? ` — solicitada por ${solicitanteNome}` : '';
      rows.push({ label: 'Consulta para', value: `${nome}${idadeStr}${relStr}${sol}`, group: 'identificacao' });
    }
  } else if (triagem.paciente_nome) {
    // Formato novo (sem para_quem, mas com paciente_nome)
    const idadeFormatada = triagem.paciente_data_nascimento
      ? formatIdade(triagem.paciente_data_nascimento)
      : triagem.paciente_idade != null ? `${triagem.paciente_idade} anos` : null;
    const partes = [triagem.paciente_nome, idadeFormatada].filter(Boolean);
    const sol = solicitanteNome && triagem.dependent_id ? ` — solicitada por ${solicitanteNome}` : '';
    rows.push({ label: 'Consulta para', value: `${partes.join(', ')}${sol}`, group: 'identificacao' });
  }

  if (triagem.tipo_consulta) {
    const tipoLabel = triagem.tipo_consulta === 'tratamento'
      ? 'Orientação de tratamento'
      : triagem.tipo_consulta === 'interpretacao_receita'
        ? 'Interpretação de receita'
        : 'Tirar dúvida'; // retrocompatibilidade com registros antigos
    rows.push({ label: 'Tipo de consulta', value: tipoLabel, group: 'identificacao' });
  }
  if (triagem.identificacao?.sexo) rows.push({ label: 'Sexo', value: triagem.identificacao.sexo, group: 'identificacao' });
  if (triagem.identificacao?.peso) rows.push({ label: 'Peso', value: `${triagem.identificacao.peso} kg`, group: 'identificacao' });

  const textFields = ['queixa_principal','tempo_sintomas','evolucao_sintomas','localizacao','outros_sintomas','quais_medicamentos','qual_doenca','quais_alergias','quais_outras_alergias'];
  const historicoFields = new Set(['quais_medicamentos','qual_doenca','quais_alergias','quais_outras_alergias']);
  textFields.forEach((k) => {
    if (triagem[k]) rows.push({ label: SINAIS_LABEL[k] || k, value: triagem[k], group: historicoFields.has(k) ? 'historico' : 'sintomas' });
  });

  if (triagem.febre) {
    const partes = [
      triagem.dias_febre ? `há ${triagem.dias_febre} dia${triagem.dias_febre > 1 ? 's' : ''}` : null,
      triagem.temperatura ? `${triagem.temperatura}°C` : null,
    ].filter(Boolean);
    rows.push({ label: 'Febre', value: partes.length > 0 ? partes.join(' · ') : 'Sim', group: 'sintomas' });
  }

  if (typeof triagem.intensidade === 'number' && triagem.intensidade > 0) rows.push({ label: 'Intensidade geral', value: `${triagem.intensidade}/10`, group: 'sintomas' });
  if (typeof triagem.intensidade_dor === 'number' && triagem.intensidade_dor > 0) rows.push({ label: 'Intensidade da dor', value: `${triagem.intensidade_dor}/10`, group: 'sintomas' });

  const boolFields = [
    ['dor', 'Dor', 'sintomas'],
    ['doenca_cronica', 'Doença crônica', 'historico'],
    ['gravida_amamentando', 'Grávida/amamentando', 'historico'],
    ['problema_anterior', 'Problema anterior', 'historico'],
    ['acompanhamento_medico', 'Acompanhamento médico', 'historico'],
    ['exercicios', 'Exercícios físicos', 'historico'],
    ['medicamentos_atuais', 'Medicamentos atuais', 'historico'],
    ['medicamento_problema', 'Usou medicamento', 'sintomas'],
    ['houve_melhora', 'Houve melhora', 'sintomas'],
    ['alergia_medicamento', 'Alergia a medicamentos', 'historico'],
    ['outras_alergias', 'Outras alergias', 'historico'],
    ['receita_anexo', 'Tem receita', 'historico'],
  ];
  boolFields.forEach(([k, label, group]) => {
    if (triagem[k] === true) rows.push({ label, value: 'Sim', group });
  });

  const sinais = triagem.sinais_alerta || [];

  const groups = ['identificacao', 'sintomas', 'historico']
    .map((g) => ({ key: g, items: rows.filter((r) => r.group === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-1">{GROUP_TITLES[g.key]}</p>
          <dl className="m-0">
            {g.items.map((r) => (
              <div key={r.label} className="flex gap-2 py-1 border-b border-line/60 last:border-b-0">
                <dt className="text-xs text-muted shrink-0 w-40">{r.label}</dt>
                <dd className="text-[13px] text-ink m-0 flex-1 break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      {sinais.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-error uppercase tracking-wide mb-1.5">Sinais de alerta</p>
          <div className="flex flex-wrap gap-1.5">
            {sinais.map((s) => (
              <span key={s} className="text-xs font-medium text-error bg-error-wash border border-error/30 rounded-full px-2.5 py-1">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TriagemDisplay;
