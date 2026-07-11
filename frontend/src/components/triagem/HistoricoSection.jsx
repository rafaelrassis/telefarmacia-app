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
        <p className={sec}>Histórico de saúde</p>
        <SimNaoRow value={doencaCronica} onChange={setDoencaCronica} label="Doença crônica?" />
        {doencaCronica && (
          <div className="pl-4 border-l-2 border-line mt-1 mb-2">
            <textarea value={qualDoenca} onChange={(e) => setQualDoenca(e.target.value)} placeholder="Diabetes, hipertensão, asma..." className={area} />
          </div>
        )}
        <SimNaoRow value={gravidaAmamentando} onChange={setGravidaAmamentando} label="Grávida ou amamentando?" />
        <SimNaoRow value={problemaAnterior} onChange={setProblemaAnterior} label="Já teve esse problema antes?" />
        <SimNaoRow value={acompanhamentoMedico} onChange={setAcompanhamentoMedico} label="Em acompanhamento médico?" />
        <SimNaoRow value={exercicios} onChange={setExercicios} label="Pratica exercícios físicos?" />
      </>
    )}

    <p className={sec}>Uso de medicamentos</p>
    <SimNaoRow value={medicamentosAtuais} onChange={setMedicamentosAtuais} label="Usa algum medicamento atualmente?" />
    {medicamentosAtuais && (
      <div className="pl-4 border-l-2 border-line mt-1 mb-2">
        <textarea value={quaisMedicamentos} onChange={(e) => setQuaisMedicamentos(e.target.value)} placeholder="Nome dos medicamentos..." className={area} />
      </div>
    )}
    <SimNaoRow value={medicamentoProblema} onChange={setMedicamentoProblema} label="Usou medicamento para esse problema?" />
    {medicamentoProblema && (
      <div className="pl-4 border-l-2 border-line mt-1">
        <SimNaoRow value={houveMelhora} onChange={setHouveMelhora} label="Houve melhora?" />
      </div>
    )}

    <p className={sec}>Alergias</p>
    <SimNaoRow value={alergiasMedicamento} onChange={setAlergiasMedicamento} label="Alergia a medicamentos?" />
    {alergiasMedicamento && (
      <div className="pl-4 border-l-2 border-line mt-1 mb-2">
        <textarea value={quaisAlergias} onChange={(e) => setQuaisAlergias(e.target.value)} placeholder="Quais medicamentos?" className={area} />
      </div>
    )}
    <SimNaoRow value={outrasAlergias} onChange={setOutrasAlergias} label="Outras alergias?" />
    {outrasAlergias && (
      <div className="pl-4 border-l-2 border-line mt-1 mb-2">
        <textarea value={quaisOutrasAlergias} onChange={(e) => setQuaisOutrasAlergias(e.target.value)} placeholder="Alimentos, animais, materiais..." className={area} />
      </div>
    )}
  </>
);

export default HistoricoSection;
