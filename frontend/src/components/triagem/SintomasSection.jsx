import React from 'react';
import { inp, area, lbl, sec, Toggle, SINAIS_ALERTA } from './shared';

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
    <p style={sec}>Queixa principal</p>
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>O que está sentindo?</label>
      <textarea value={queixaPrincipal} onChange={(e) => setQueixaPrincipal(e.target.value)} placeholder="Descreva seus sintomas..." style={area} />
      {queixaPrefilled && (
        <p style={{ fontSize: 11, color: '#3B9FE0', margin: '4px 0 0' }}>
          Preenchido com o que você digitou na página inicial
        </p>
      )}
    </div>
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>Há quanto tempo?</label>
      <input type="text" value={tempoSintomas} onChange={(e) => setTempoSintomas(e.target.value)} placeholder="Ex: 3 dias, 1 semana..." style={inp} />
    </div>
    <div style={{ marginBottom: 4 }}>
      <label style={lbl}>Os sintomas estão:</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {['Melhorando', 'Piorando', 'Iguais'].map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setEvolucaoSintomas(op.toLowerCase())}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: `1px solid ${evolucaoSintomas === op.toLowerCase() ? '#3B9FE0' : '#e5e7eb'}`,
              background: evolucaoSintomas === op.toLowerCase() ? '#eff6ff' : 'white',
              color: evolucaoSintomas === op.toLowerCase() ? '#1d4ed8' : '#6b7280',
              cursor: 'pointer',
            }}
          >
            {op}
          </button>
        ))}
      </div>
    </div>

    <p style={sec}>Características dos sintomas</p>
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>Localização</label>
      <input type="text" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ex: cabeça, barriga, peito..." style={inp} />
    </div>
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={lbl}>Intensidade geral</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#3B9FE0' }}>{intensidade}/10</span>
      </div>
      <input
        type="range" min={0} max={10} value={intensidade}
        onChange={(e) => setIntensidade(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: '#3B9FE0' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
        <span>Sem desconforto</span>
        <span>Insuportável</span>
      </div>
    </div>
    <Toggle value={febre} onChange={setFebre} label="Possui febre?" />
    {febre && (
      <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginBottom: 8, marginTop: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Temperatura (°C)</label>
            <input type="text" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="Ex: 38,5" style={inp} />
          </div>
          <div>
            <label style={lbl}>Há quantos dias? <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="number" min={1} max={99} value={diasFebre}
              onChange={(e) => { setDiasFebre(e.target.value.slice(0, 2)); setDiasFebreError(false); }}
              placeholder="Ex: 3"
              style={{ ...inp, borderColor: diasFebreError ? '#ef4444' : '#e5e7eb' }}
            />
          </div>
        </div>
        {diasFebreError && (
          <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>
            Informe há quantos dias a febre está presente.
          </p>
        )}
      </div>
    )}
    <div style={{ marginTop: 12 }}>
      <label style={lbl}>Outros sintomas associados</label>
      <textarea value={outrosSintomas} onChange={(e) => setOutrosSintomas(e.target.value)} placeholder="Náusea, cansaço, tontura..." style={area} />
    </div>

    <p style={sec}>Sinais de alerta</p>
    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, marginTop: -8 }}>
      Toque para marcar se algum dos seguintes estiver presente:
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {SINAIS_ALERTA.map((s) => {
        const marcado = sinaisAlerta.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggleSinal(s)}
            aria-pressed={marcado}
            style={{
              textAlign: 'left', padding: '10px 12px', borderRadius: 8, fontSize: 13,
              border: `1.5px solid ${marcado ? '#dc2626' : '#e5e7eb'}`,
              background: marcado ? '#fef2f2' : 'white',
              color: marcado ? '#dc2626' : '#374151',
              fontWeight: marcado ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  </>
);

export default SintomasSection;
