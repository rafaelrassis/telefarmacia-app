import React from 'react';
import { inp, area, lbl, sec, Toggle, Slider, SINAIS_ALERTA } from './shared';

const SintomasSection = ({
  queixaPrincipal, setQueixaPrincipal,
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
    <p style={sec}>2. Queixa principal</p>
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>O que está sentindo?</label>
      <textarea value={queixaPrincipal} onChange={(e) => setQueixaPrincipal(e.target.value)} placeholder="Descreva seus sintomas..." style={area} />
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

    <p style={sec}>3. Características dos sintomas</p>
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>Localização</label>
      <input type="text" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ex: cabeça, barriga, peito..." style={inp} />
    </div>
    <Slider value={intensidade} onChange={setIntensidade} label="Intensidade geral" />
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

    <p style={sec}>7. Sinais de alerta</p>
    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, marginTop: -8 }}>
      Marque se algum dos seguintes estiver presente:
    </p>
    {SINAIS_ALERTA.map((s) => (
      <label
        key={s}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid #f9fafb',
        }}
      >
        <input
          type="checkbox"
          checked={sinaisAlerta.includes(s)}
          onChange={() => toggleSinal(s)}
          style={{ width: 16, height: 16, accentColor: '#dc2626', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, color: sinaisAlerta.includes(s) ? '#dc2626' : '#374151', fontWeight: sinaisAlerta.includes(s) ? 600 : 400 }}>
          {s}
        </span>
      </label>
    ))}
  </>
);

export default SintomasSection;
