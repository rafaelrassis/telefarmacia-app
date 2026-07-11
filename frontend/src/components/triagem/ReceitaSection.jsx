import React from 'react';
import { Check, Paperclip } from 'lucide-react';
import { area, areaError, lbl, sec, Toggle } from './shared';

const ReceitaSection = ({
  tipoConsulta,
  temReceita, setTemReceita,
  duvidaReceita, setDuvidaReceita, duvidaError, setDuvidaError,
  handleAnexoChange, anexoError, receitaAnexoFile,
}) => (
  <>
    {tipoConsulta === 'tratamento' && (
      <>
        <p className={sec}>Receita</p>
        <Toggle value={temReceita} onChange={setTemReceita} label="Tem receita para compartilhar?" />
        {temReceita && (
          <div className="px-3 py-2 bg-surface rounded-lg mt-2 border border-line">
            <p className="text-[13px] text-muted m-0">
              Traga a receita física ou tire uma foto para mostrar ao farmacêutico durante o atendimento.
            </p>
          </div>
        )}
      </>
    )}

    {tipoConsulta === 'interpretacao_receita' && (
      <>
        <p className={sec}>Dúvida sobre a receita</p>
        <div className="mb-2">
          <label className={lbl}>
            Descreva sua dúvida <span className="text-error">*</span>
          </label>
          <textarea
            value={duvidaReceita}
            onChange={(e) => { setDuvidaReceita(e.target.value); setDuvidaError(false); }}
            placeholder="Ex: quero entender a posologia, dosagem, interações com outros medicamentos..."
            className={duvidaError ? areaError : area}
          />
          {duvidaError && (
            <p className="text-[11px] text-error mt-1">
              Descreva sua dúvida (mínimo 10 caracteres).
            </p>
          )}
        </div>
        <div className="mb-2">
          <label className={lbl}>Anexar foto ou PDF da receita <span className="text-muted font-normal">(opcional)</span></label>
          <div className={`border-2 border-dashed rounded-xl px-3 py-4 text-center bg-surface ${anexoError ? 'border-error' : 'border-line'}`}>
            <Paperclip className="w-5 h-5 text-muted mx-auto mb-1.5" strokeWidth={2} />
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleAnexoChange}
              className="w-full text-[13px] text-ink"
            />
          </div>
          {anexoError && <p className="text-[11px] text-error mt-1">{anexoError}</p>}
          {receitaAnexoFile && !anexoError && (
            <p className="flex items-center gap-1 text-[11px] text-success mt-1">
              <Check className="w-3.5 h-3.5" strokeWidth={3} /> {receitaAnexoFile.name}
            </p>
          )}
        </div>
        <div className="px-3 py-2.5 bg-success-wash rounded-lg border border-success/30">
          <p className="text-[13px] text-success m-0">
            Tenha a receita em mãos (física ou foto) para mostrar ao farmacêutico durante o atendimento.
          </p>
        </div>
      </>
    )}
  </>
);

export default ReceitaSection;
