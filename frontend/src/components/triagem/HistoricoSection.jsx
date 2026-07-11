import React from 'react';
import { area, sec, SimNaoRow } from './shared';

const HistoricoSection = ({
  isTratamento,
  doencaCronica, setDoencaCronica, qualDoenca, setQualDoenca,
  gravidaAmamentando, setGravidaAmamentando,
  problemaAnterior, setProblemaAnterior,
  acompanhamentoMedico, setAcompanhamentoMedico,
  exercicios, setExercicios,
  medicamentosAtuais, setMedicamentosAtuais, quaisMedicamentos, setQuaisMedicamentos,
  medicamentoProblema, setMedicamentoProblema, houveMelhora, setHouveMelhora,
  alergiasMedicamento, setAlergiasMedicamento, quaisAlergias, setQuaisAlergias,
  outrasAlergias, setOutrasAlergias, quaisOutrasAlergias, setQuaisOutrasAlergias,
}) => (
  <>
    {isTratamento && (
      <>
        <p style={sec}>Histórico de saúde</p>
        <SimNaoRow value={doencaCronica} onChange={setDoencaCronica} label="Doença crônica?" />
        {doencaCronica && (
          <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
            <textarea value={qualDoenca} onChange={(e) => setQualDoenca(e.target.value)} placeholder="Diabetes, hipertensão, asma..." style={area} />
          </div>
        )}
        <SimNaoRow value={gravidaAmamentando} onChange={setGravidaAmamentando} label="Grávida ou amamentando?" />
        <SimNaoRow value={problemaAnterior} onChange={setProblemaAnterior} label="Já teve esse problema antes?" />
        <SimNaoRow value={acompanhamentoMedico} onChange={setAcompanhamentoMedico} label="Em acompanhamento médico?" />
        <SimNaoRow value={exercicios} onChange={setExercicios} label="Pratica exercícios físicos?" />
      </>
    )}

    <p style={sec}>Uso de medicamentos</p>
    <SimNaoRow value={medicamentosAtuais} onChange={setMedicamentosAtuais} label="Usa algum medicamento atualmente?" />
    {medicamentosAtuais && (
      <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
        <textarea value={quaisMedicamentos} onChange={(e) => setQuaisMedicamentos(e.target.value)} placeholder="Nome dos medicamentos..." style={area} />
      </div>
    )}
    <SimNaoRow value={medicamentoProblema} onChange={setMedicamentoProblema} label="Usou medicamento para esse problema?" />
    {medicamentoProblema && (
      <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4 }}>
        <SimNaoRow value={houveMelhora} onChange={setHouveMelhora} label="Houve melhora?" />
      </div>
    )}

    <p style={sec}>Alergias</p>
    <SimNaoRow value={alergiasMedicamento} onChange={setAlergiasMedicamento} label="Alergia a medicamentos?" />
    {alergiasMedicamento && (
      <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
        <textarea value={quaisAlergias} onChange={(e) => setQuaisAlergias(e.target.value)} placeholder="Quais medicamentos?" style={area} />
      </div>
    )}
    <SimNaoRow value={outrasAlergias} onChange={setOutrasAlergias} label="Outras alergias?" />
    {outrasAlergias && (
      <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
        <textarea value={quaisOutrasAlergias} onChange={(e) => setQuaisOutrasAlergias(e.target.value)} placeholder="Alimentos, animais, materiais..." style={area} />
      </div>
    )}
  </>
);

export default HistoricoSection;
