import React from 'react';
import { Pill, Search } from 'lucide-react';
import { sec } from './shared';

const BtnTipo = ({ val, label, Icon, tipoConsulta, setTipoConsulta }) => {
  const selecionado = tipoConsulta === val;
  return (
    <button
      type="button"
      onClick={() => setTipoConsulta(val)}
      className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-[13px] font-semibold transition-colors ${
        selecionado ? 'border-brand bg-brand-wash text-brand-deep' : 'border-line bg-canvas text-ink hover:border-brand/50'
      }`}
    >
      <Icon className="w-5 h-5" strokeWidth={2.25} />
      {label}
    </button>
  );
};

const TipoConsulta = ({ tipoConsulta, setTipoConsulta }) => (
  <>
    <p className={sec}>Objetivo da consulta</p>
    <div className="flex gap-2 mb-1">
      <BtnTipo val="tratamento" label="Orientação de tratamento" Icon={Pill} tipoConsulta={tipoConsulta} setTipoConsulta={setTipoConsulta} />
      <BtnTipo val="interpretacao_receita" label="Interpretação de receita" Icon={Search} tipoConsulta={tipoConsulta} setTipoConsulta={setTipoConsulta} />
    </div>
    {!tipoConsulta && (
      <div className="bg-surface rounded-xl p-5 text-center mt-2">
        <p className="text-sm text-muted m-0">
          Selecione o objetivo da consulta acima para continuar.
        </p>
      </div>
    )}
  </>
);

export default TipoConsulta;
