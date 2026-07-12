import React from 'react';
import { ClipboardCheck } from 'lucide-react';
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
  const fldCls = (val, required = true) =>
    `py-3 border-b border-line pl-1.5 ${hasError && required && !val ? 'border-l-2 border-l-error' : 'border-l-2 border-l-transparent'}`;

  if (readonly && data) {
    const lbl = (key, val) => RADIO_LABELS[key]?.[val] ?? val ?? '—';
    const rows = [
      ['Problema autolimitado', lbl('problema_autolimitado', data.problema_autolimitado)],
      ['Paciente compreendeu as orientações', lbl('paciente_compreendeu', data.paciente_compreendeu)],
      ['Contraindicação ao medicamento', lbl('contraindicacao', data.contraindicacao)],
      ...(data.contraindicacao === 'sim' && data.contraindicacao_detalhe ? [['Qual contraindicação', data.contraindicacao_detalhe]] : []),
      ['Encaminhamento médico', lbl('encaminhamento_medico', data.encaminhamento_medico)],
      ...(data.encaminhamento_medico === 'sim' && data.encaminhamento_detalhe ? [['Especialidade/motivo', data.encaminhamento_detalhe]] : []),
    ];
    return (
      <div className="border border-line rounded-xl overflow-hidden">
        <div className="px-3.5 py-2.5 bg-success-wash border-b border-line flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-success" />
          <span className="text-[13px] font-bold text-success">Finalização da Consulta</span>
        </div>
        <div className="px-3.5 py-3 bg-surface">
          <dl className="m-0">
            {rows.map(([label, value]) => (
              <div key={label} className="flex gap-2 py-1 border-b border-line/60 last:border-b-0">
                <dt className="text-xs text-muted shrink-0 w-[200px]">{label}</dt>
                <dd className="text-[13px] text-ink m-0 flex-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  const q = (label, required) => (
    <span className="text-[13px] font-semibold text-ink">
      {label}{required && <span className="text-error ml-0.5">*</span>}
    </span>
  );

  const detalheCls = (val) =>
    `mt-2.5 w-full box-border rounded-lg px-2.5 py-2 text-[13px] resize-y font-inherit outline-none border ${
      hasError && !val.trim() ? 'border-error bg-error-wash' : 'border-line bg-surface'
    }`;

  return (
    <div className={`border rounded-xl overflow-hidden ${hasError ? 'border-error/50' : 'border-line'}`}>
      <div className="px-3.5 py-2.5 bg-surface border-b border-line flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink inline-flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4" />
          Finalização da Consulta
        </span>
        <span className="text-[11px] text-error">* Obrigatório</span>
      </div>
      <div className="px-3.5 pt-1 pb-2 bg-canvas">

        <div className={fldCls(problemaAutolimitado)}>
          <div className="mb-2">{q('O problema é autolimitado?', true)}</div>
          <RadioGroup name="autolimitado" options={[['sim','Sim'],['nao','Não'],['indeterminado','Indeterminado']]}
            value={problemaAutolimitado} onChange={(v) => { setProblemaAutolimitado(v); onChangeAny?.(); }} error={hasError} />
        </div>

        <div className={fldCls(pacienteCompreendeu)}>
          <div className="mb-2">{q('O paciente compreendeu as orientações?', true)}</div>
          <RadioGroup name="compreendeu" options={[['sim','Sim'],['parcialmente','Parcialmente'],['nao','Não']]}
            value={pacienteCompreendeu} onChange={(v) => { setPacienteCompreendeu(v); onChangeAny?.(); }} error={hasError} />
        </div>

        <div className={fldCls(contraindicacao)}>
          <div className="mb-2">{q('Existe contraindicação ao medicamento?', true)}</div>
          <RadioGroup name="contraindicacao" options={[['sim','Sim'],['nao','Não'],['nao_se_aplica','Não se aplica']]}
            value={contraindicacao} onChange={(v) => { setContraindicacao(v); onChangeAny?.(); }} error={hasError} />
          {contraindicacao === 'sim' && (
            <textarea
              value={contraindicacaoDetalhe}
              onChange={(e) => { setContraindicacaoDetalhe(e.target.value); onChangeAny?.(); }}
              placeholder="Qual contraindicação?"
              rows={2}
              className={detalheCls(contraindicacaoDetalhe)}
            />
          )}
        </div>

        <div className={`${fldCls(encaminhamentoMedico)} border-b-0`}>
          <div className="mb-2">{q('Necessita encaminhamento médico?', true)}</div>
          <RadioGroup name="encaminhamento" options={[['sim','Sim'],['nao','Não']]}
            value={encaminhamentoMedico} onChange={(v) => { setEncaminhamentoMedico(v); onChangeAny?.(); }}
            error={hasError} />
          {encaminhamentoMedico === 'sim' && (
            <textarea
              value={encaminhamentoDetalhe}
              onChange={(e) => { setEncaminhamentoDetalhe(e.target.value); onChangeAny?.(); }}
              placeholder="Para qual especialidade/motivo?"
              rows={2}
              className={detalheCls(encaminhamentoDetalhe)}
            />
          )}
        </div>

        {hasError && (
          <p className="text-xs text-error font-medium mt-1">
            Preencha todos os campos de finalização antes de concluir.
          </p>
        )}
      </div>
    </div>
  );
};

export default FinalizacaoSection;
