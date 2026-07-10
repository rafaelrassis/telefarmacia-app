import React from 'react';
import { formatIdade } from '../../utils/formatIdade.js';
import { SINAIS_LABEL, RELACAO_LABEL } from '../../utils/consultaFormat';

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
      rows.push({ label: 'Consulta para', value: `${nome} (para si mesmo)` });
    } else {
      const sol = solicitanteNome ? ` — solicitada por ${solicitanteNome}` : '';
      rows.push({ label: 'Consulta para', value: `${nome}${idadeStr}${relStr}${sol}` });
    }
  } else if (triagem.paciente_nome) {
    // Formato novo (sem para_quem, mas com paciente_nome)
    const idadeFormatada = triagem.paciente_data_nascimento
      ? formatIdade(triagem.paciente_data_nascimento)
      : triagem.paciente_idade != null ? `${triagem.paciente_idade} anos` : null;
    const partes = [triagem.paciente_nome, idadeFormatada].filter(Boolean);
    const sol = solicitanteNome && triagem.dependent_id ? ` — solicitada por ${solicitanteNome}` : '';
    rows.push({ label: 'Consulta para', value: `${partes.join(', ')}${sol}` });
  }

  if (triagem.tipo_consulta) {
    const tipoLabel = triagem.tipo_consulta === 'tratamento'
      ? 'Orientação de tratamento'
      : triagem.tipo_consulta === 'interpretacao_receita'
        ? 'Interpretação de receita'
        : 'Tirar dúvida'; // retrocompatibilidade com registros antigos
    rows.push({ label: 'Tipo de consulta', value: tipoLabel });
  }
  if (triagem.identificacao?.sexo) rows.push({ label: 'Sexo', value: triagem.identificacao.sexo });
  if (triagem.identificacao?.peso) rows.push({ label: 'Peso', value: `${triagem.identificacao.peso} kg` });

  const textFields = ['queixa_principal','tempo_sintomas','evolucao_sintomas','localizacao','outros_sintomas','quais_medicamentos','qual_doenca','quais_alergias','quais_outras_alergias'];
  textFields.forEach((k) => {
    if (triagem[k]) rows.push({ label: SINAIS_LABEL[k] || k, value: triagem[k] });
  });

  if (triagem.febre) {
    const partes = [
      triagem.dias_febre ? `há ${triagem.dias_febre} dia${triagem.dias_febre > 1 ? 's' : ''}` : null,
      triagem.temperatura ? `${triagem.temperatura}°C` : null,
    ].filter(Boolean);
    rows.push({ label: 'Febre', value: partes.length > 0 ? partes.join(' · ') : 'Sim' });
  }

  if (typeof triagem.intensidade === 'number' && triagem.intensidade > 0) rows.push({ label: 'Intensidade geral', value: `${triagem.intensidade}/10` });
  if (typeof triagem.intensidade_dor === 'number' && triagem.intensidade_dor > 0) rows.push({ label: 'Intensidade da dor', value: `${triagem.intensidade_dor}/10` });

  const boolFields = [
    ['dor', 'Dor'],
    ['doenca_cronica', 'Doença crônica'],
    ['gravida_amamentando', 'Grávida/amamentando'],
    ['problema_anterior', 'Problema anterior'],
    ['acompanhamento_medico', 'Acompanhamento médico'],
    ['exercicios', 'Exercícios físicos'],
    ['medicamentos_atuais', 'Medicamentos atuais'],
    ['medicamento_problema', 'Usou medicamento'],
    ['houve_melhora', 'Houve melhora'],
    ['alergia_medicamento', 'Alergia a medicamentos'],
    ['outras_alergias', 'Outras alergias'],
    ['receita_anexo', 'Tem receita'],
  ];
  boolFields.forEach(([k, label]) => {
    if (triagem[k] === true) rows.push({ label, value: 'Sim' });
  });

  const sinais = triagem.sinais_alerta || [];

  return (
    <div>
      <dl style={{ margin: 0 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
            <dt style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, width: 160 }}>{r.label}</dt>
            <dd style={{ fontSize: 13, color: '#111827', margin: 0, flex: 1, wordBreak: 'break-word' }}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {sinais.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', margin: '0 0 4px' }}>Sinais de alerta</p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {sinais.map((s) => <li key={s} style={{ fontSize: 13, color: '#dc2626', marginBottom: 2 }}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TriagemDisplay;
