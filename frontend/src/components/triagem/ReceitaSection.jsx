import React from 'react';
import { area, lbl, sec, Toggle } from './shared';

const ReceitaSection = ({
  tipoConsulta,
  temReceita, setTemReceita,
  duvidaReceita, setDuvidaReceita, duvidaError, setDuvidaError,
  handleAnexoChange, anexoError, receitaAnexoFile,
}) => (
  <>
    {tipoConsulta === 'tratamento' && (
      <>
        <p style={sec}>Receita</p>
        <Toggle value={temReceita} onChange={setTemReceita} label="Tem receita para compartilhar?" />
        {temReceita && (
          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, marginTop: 8, border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Traga a receita física ou tire uma foto para mostrar ao farmacêutico durante o atendimento.
            </p>
          </div>
        )}
      </>
    )}

    {tipoConsulta === 'interpretacao_receita' && (
      <>
        <p style={sec}>Dúvida sobre a receita</p>
        <div style={{ marginBottom: 8 }}>
          <label style={lbl}>
            Descreva sua dúvida <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            value={duvidaReceita}
            onChange={(e) => { setDuvidaReceita(e.target.value); setDuvidaError(false); }}
            placeholder="Ex: quero entender a posologia, dosagem, interações com outros medicamentos..."
            style={{ ...area, borderColor: duvidaError ? '#ef4444' : '#e5e7eb' }}
          />
          {duvidaError && (
            <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0' }}>
              Descreva sua dúvida (mínimo 10 caracteres).
            </p>
          )}
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={lbl}>Anexar foto ou PDF da receita <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
          <div style={{
            border: `1.5px dashed ${anexoError ? '#ef4444' : '#d1d5db'}`, borderRadius: 10,
            padding: '14px 12px', textAlign: 'center', background: '#f9fafb',
          }}>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleAnexoChange}
              style={{ width: '100%', fontSize: 13, color: '#374151', fontFamily: 'inherit' }}
            />
          </div>
          {anexoError && <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0' }}>{anexoError}</p>}
          {receitaAnexoFile && !anexoError && (
            <p style={{ fontSize: 11, color: '#059669', margin: '3px 0 0' }}>✓ {receitaAnexoFile.name}</p>
          )}
        </div>
        <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
            Tenha a receita em mãos (física ou foto) para mostrar ao farmacêutico durante o atendimento.
          </p>
        </div>
      </>
    )}
  </>
);

export default ReceitaSection;
