import React from 'react';
import { sec } from './shared';

const BtnTipo = ({ val, label, tipoConsulta, setTipoConsulta }) => (
  <button
    type="button"
    onClick={() => setTipoConsulta(val)}
    style={{
      flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
      border: `2px solid ${tipoConsulta === val ? '#3B9FE0' : '#e5e7eb'}`,
      background: tipoConsulta === val ? '#eff6ff' : 'white',
      color: tipoConsulta === val ? '#1d4ed8' : '#374151',
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

const TipoConsulta = ({ tipoConsulta, setTipoConsulta }) => (
  <>
    <p style={sec}>Objetivo da consulta</p>
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <BtnTipo val="tratamento" label="💊 Orientação de tratamento" tipoConsulta={tipoConsulta} setTipoConsulta={setTipoConsulta} />
      <BtnTipo val="interpretacao_receita" label="🔍 Interpretação de receita" tipoConsulta={tipoConsulta} setTipoConsulta={setTipoConsulta} />
    </div>
    {!tipoConsulta && (
      <div style={{ background: '#f9fafb', borderRadius: 10, padding: 20, textAlign: 'center', marginTop: 8 }}>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
          Selecione o objetivo da consulta acima para continuar.
        </p>
      </div>
    )}
  </>
);

export default TipoConsulta;
