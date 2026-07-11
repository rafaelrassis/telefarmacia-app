import React from 'react';
import { inp, area, lbl, sec, Toggle, inpError, SINAIS_ALERTA } from './shared';

const SintomasSection = ({
  queixaPrincipal, setQueixaPrincipal, queixaPrefilled,
  tempoSintomas, setTempoSintomas,
  evolucaoSintomas, setEvolucaoSintomas,
  localizacao, setLocalizacao,
  intensidade, setIntensidade,
  febre, setFebre,
  temperatura, setTemperatura,
  diasFebre, setDiasFebre, diasFebreError, setDiasFebreError,
  outrosSintomas, setOutrosSintomas,
  sinaisAlerta, toggleSinal,
}) => (
  <>
    <p className={sec}>Queixa principal</p>
    <div className="mb-3">
      <label className={lbl}>O que está sentindo?</label>
      <textarea value={queixaPrincipal} onChange={(e) => setQueixaPrincipal(e.target.value)} placeholder="Descreva seus sintomas..." className={area} />
      {queixaPrefilled && (
        <p className="text-[11px] text-brand mt-1">
          Preenchido com o que você digitou na página inicial
        </p>
      )}
    </div>
    <div className="mb-3">
      <label className={lbl}>Há quanto tempo?</label>
      <input type="text" value={tempoSintomas} onChange={(e) => setTempoSintomas(e.target.value)} placeholder="Ex: 3 dias, 1 semana..." className={inp} />
    </div>
    <div className="mb-1">
      <label className={lbl}>Os sintomas estão:</label>
      <div className="flex gap-1.5">
        {['Melhorando', 'Piorando', 'Iguais'].map((op) => {
          const selecionado = evolucaoSintomas === op.toLowerCase();
          return (
            <button
              key={op}
              type="button"
              onClick={() => setEvolucaoSintomas(op.toLowerCase())}
              className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${
                selecionado ? 'border-brand bg-brand-wash text-brand-deep' : 'border-line bg-canvas text-muted'
              }`}
            >
              {op}
            </button>
          );
        })}
      </div>
    </div>

    <p className={sec}>Características dos sintomas</p>
    <div className="mb-3">
      <label className={lbl}>Localização</label>
      <input type="text" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ex: cabeça, barriga, peito..." className={inp} />
    </div>
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className={lbl}>Intensidade geral</span>
        <span className="text-xl font-extrabold text-brand">{intensidade}/10</span>
      </div>
      <input
        type="range" min={0} max={10} value={intensidade}
        onChange={(e) => setIntensidade(parseInt(e.target.value))}
        className="w-full accent-brand"
      />
      <div className="flex justify-between text-[11px] text-muted">
        <span>Sem desconforto</span>
        <span>Insuportável</span>
      </div>
    </div>
    <Toggle value={febre} onChange={setFebre} label="Possui febre?" />
    {febre && (
      <div className="pl-4 border-l-2 border-line mb-2 mt-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Temperatura (°C)</label>
            <input type="text" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="Ex: 38,5" className={inp} />
          </div>
          <div>
            <label className={lbl}>Há quantos dias? <span className="text-error">*</span></label>
            <input
              type="number" min={1} max={99} value={diasFebre}
              onChange={(e) => { setDiasFebre(e.target.value.slice(0, 2)); setDiasFebreError(false); }}
              placeholder="Ex: 3"
              className={diasFebreError ? inpError : inp}
            />
          </div>
        </div>
        {diasFebreError && (
          <p className="text-[11px] text-error mt-1">
            Informe há quantos dias a febre está presente.
          </p>
        )}
      </div>
    )}
    <div className="mt-3">
      <label className={lbl}>Outros sintomas associados</label>
      <textarea value={outrosSintomas} onChange={(e) => setOutrosSintomas(e.target.value)} placeholder="Náusea, cansaço, tontura..." className={area} />
    </div>

    <p className={sec}>Sinais de alerta</p>
    <p className="text-xs text-muted mb-2.5 -mt-2">
      Toque para marcar se algum dos seguintes estiver presente:
    </p>
    <div className="grid grid-cols-2 gap-2">
      {SINAIS_ALERTA.map((s) => {
        const marcado = sinaisAlerta.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggleSinal(s)}
            aria-pressed={marcado}
            className={`text-left px-3 py-2.5 rounded-lg text-[13px] border-2 transition-colors ${
              marcado ? 'border-error bg-error-wash text-error font-semibold' : 'border-line bg-canvas text-ink'
            }`}
          >
            {s}
          </button>
        );
      })}
    </div>
  </>
);

export default SintomasSection;
