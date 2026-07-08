import React from 'react';
import RadioGroup from './RadioGroup';
import { RADIO_LABELS } from '../../utils/consultaFormat';

const FinalizacaoSection = ({
  readonly, data,
  hasError,
  problemaAutolimitado, setProblemaAutolimitado,
  pacienteCompreendeu, setPacienteCompreendeu,
  contraindicacao, setContraindicacao,
  contraindicacaoDetalhe, setContraindicacaoDetalhe,
  encaminhamentoMedico, setEncaminhamentoMedico,
  encaminhamentoDetalhe, setEncaminhamentoDetalhe,
  onChangeAny,
}) => {
  const fldStyle = (val, required = true) => ({
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
    borderLeft: (hasError && required && !val) ? '3px solid #ef4444' : '3px solid transparent',
    paddingLeft: 6,
  });

  if (readonly && data) {
    const lbl = (key, val) => RADIO_LABELS[key]?.[val] ?? val ?? '—';
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: '#f0fdf4', borderBottom: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>📋 Finalização da Consulta</span>
        </div>
        <div style={{ padding: '12px 14px', background: 'white' }}>
          <dl style={{ margin: 0 }}>
            {[
              ['Problema autolimitado', lbl('problema_autolimitado', data.problema_autolimitado)],
              ['Paciente compreendeu as orientações', lbl('paciente_compreendeu', data.paciente_compreendeu)],
              ['Contraindicação ao medicamento', lbl('contraindicacao', data.contraindicacao)],
              ...(data.contraindicacao === 'sim' && data.contraindicacao_detalhe ? [['Qual contraindicação', data.contraindicacao_detalhe]] : []),
              ['Encaminhamento médico', lbl('encaminhamento_medico', data.encaminhamento_medico)],
              ...(data.encaminhamento_medico === 'sim' && data.encaminhamento_detalhe ? [['Especialidade/motivo', data.encaminhamento_detalhe]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                <dt style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, width: 200 }}>{label}</dt>
                <dd style={{ fontSize: 13, color: '#111827', margin: 0, flex: 1, fontWeight: 500 }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  const q = (label, required) => (
    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
    </span>
  );

  return (
    <div style={{ border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>📋 Finalização da Consulta</span>
        <span style={{ fontSize: 11, color: '#ef4444' }}>* Obrigatório</span>
      </div>
      <div style={{ padding: '4px 14px 8px', background: 'white' }}>

        <div style={{ ...fldStyle(problemaAutolimitado) }}>
          <div style={{ marginBottom: 8 }}>{q('O problema é autolimitado?', true)}</div>
          <RadioGroup name="autolimitado" options={[['sim','Sim'],['nao','Não'],['indeterminado','Indeterminado']]}
            value={problemaAutolimitado} onChange={(v) => { setProblemaAutolimitado(v); onChangeAny?.(); }} error={hasError} />
        </div>

        <div style={{ ...fldStyle(pacienteCompreendeu) }}>
          <div style={{ marginBottom: 8 }}>{q('O paciente compreendeu as orientações?', true)}</div>
          <RadioGroup name="compreendeu" options={[['sim','Sim'],['parcialmente','Parcialmente'],['nao','Não']]}
            value={pacienteCompreendeu} onChange={(v) => { setPacienteCompreendeu(v); onChangeAny?.(); }} error={hasError} />
        </div>

        <div style={{ ...fldStyle(contraindicacao) }}>
          <div style={{ marginBottom: 8 }}>{q('Existe contraindicação ao medicamento?', true)}</div>
          <RadioGroup name="contraindicacao" options={[['sim','Sim'],['nao','Não'],['nao_se_aplica','Não se aplica']]}
            value={contraindicacao} onChange={(v) => { setContraindicacao(v); onChangeAny?.(); }} error={hasError} />
          {contraindicacao === 'sim' && (
            <textarea
              value={contraindicacaoDetalhe}
              onChange={(e) => { setContraindicacaoDetalhe(e.target.value); onChangeAny?.(); }}
              placeholder="Qual contraindicação?"
              rows={2}
              style={{
                marginTop: 10, width: '100%', boxSizing: 'border-box',
                border: `1px solid ${hasError && !contraindicacaoDetalhe.trim() ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
                background: hasError && !contraindicacaoDetalhe.trim() ? '#fef2f2' : 'white',
              }}
            />
          )}
        </div>

        <div style={{ ...fldStyle(encaminhamentoMedico), borderBottom: 'none' }}>
          <div style={{ marginBottom: 8 }}>{q('Necessita encaminhamento médico?', true)}</div>
          <RadioGroup name="encaminhamento" options={[['sim','Sim'],['nao','Não']]}
            value={encaminhamentoMedico} onChange={(v) => { setEncaminhamentoMedico(v); onChangeAny?.(); }}
            error={hasError} />
          {encaminhamentoMedico === 'sim' && (
            <textarea
              value={encaminhamentoDetalhe}
              onChange={(e) => { setEncaminhamentoDetalhe(e.target.value); onChangeAny?.(); }}
              placeholder="Para qual especialidade/motivo?"
              rows={2}
              style={{
                marginTop: 10, width: '100%', boxSizing: 'border-box',
                border: `1px solid ${hasError && !encaminhamentoDetalhe.trim() ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
                background: hasError && !encaminhamentoDetalhe.trim() ? '#fef2f2' : 'white',
              }}
            />
          )}
        </div>

        {hasError && (
          <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 500, marginTop: 4 }}>
            Preencha todos os campos de finalização antes de concluir.
          </p>
        )}
      </div>
    </div>
  );
};

export default FinalizacaoSection;
