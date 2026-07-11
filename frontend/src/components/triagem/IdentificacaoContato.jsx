import React from 'react';
import { formatIdade } from '../../utils/formatIdade.js';
import {
  inp, lbl, sec, initials, maskWhatsapp, toLocalDateStr,
  PARENTESCO_LABEL, DEP_COLORS,
} from './shared';

const PessoaSelector = ({ pacienteNome, dependentes, selectedPerson, setSelectedPerson }) => {
  const todosAtivos = dependentes.filter(d => d.ativo);
  if (todosAtivos.length === 0) return null;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {/* Titular */}
        <button
          type="button"
          onClick={() => setSelectedPerson(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: selectedPerson === null ? 700 : 500,
            border: selectedPerson === null ? '2px solid #3B9FE0' : '1.5px solid #e5e7eb',
            background: selectedPerson === null ? '#EAF6FE' : 'white',
            color: selectedPerson === null ? '#1D74B8' : '#374151',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B9FE0, #1D74B8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {initials(pacienteNome)}
          </span>
          {pacienteNome?.split(' ')[0] || 'Eu'}
          <span style={{ fontSize: 10, color: selectedPerson === null ? '#3B9FE0' : '#9ca3af' }}>(eu)</span>
        </button>

        {/* Dependentes */}
        {todosAtivos.map((dep, idx) => {
          const isSelected = selectedPerson?.id === dep.id;
          return (
            <button
              key={dep.id}
              type="button"
              onClick={() => setSelectedPerson(dep)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: isSelected ? 700 : 500,
                border: isSelected ? '2px solid #3B9FE0' : '1.5px solid #e5e7eb',
                background: isSelected ? '#EAF6FE' : 'white',
                color: isSelected ? '#1D74B8' : '#374151',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: `linear-gradient(135deg, ${DEP_COLORS[idx % DEP_COLORS.length].replace('from-', '').replace(' to-', ',')})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {initials(dep.nome)}
              </span>
              {dep.nome.split(' ')[0]}
              {(dep.parentesco || dep.dataNascimento) && (
                <span style={{ fontSize: 10, color: isSelected ? '#3B9FE0' : '#9ca3af' }}>
                  {[dep.parentesco ? (PARENTESCO_LABEL[dep.parentesco] ?? dep.parentesco) : null, formatIdade(dep.dataNascimento)].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const IdentificacaoContato = ({
  pacienteNome, dependentes, selectedPerson, setSelectedPerson,
  pessoaNome, pessoaIdade,
  sexo, setSexo, peso, setPeso,
  whatsappContato, setWhatsappContato, whatsappError, setWhatsappError,
  modalidadeAtend, setModalidadeAtend,
  perfilCarregado, perfilTemNasc,
  nascInput, setNascInput, nascError, setNascError, nascSaving, handleSalvarNasc,
}) => (
  <>
    {dependentes.filter(d => d.ativo).length > 0 && (
      <>
        <p style={sec}>Para quem é a consulta?</p>
        <PessoaSelector pacienteNome={pacienteNome} dependentes={dependentes} selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} />
      </>
    )}

    {/* 1. Identificação */}
    <p style={sec}>1. Identificação</p>
    <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <span style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 2 }}>Paciente</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{pessoaNome || '—'}</span>
      {(selectedPerson?.dataNascimento || pessoaIdade !== null) && (
        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>
          {selectedPerson?.dataNascimento
            ? formatIdade(selectedPerson.dataNascimento)
            : `${pessoaIdade} anos`}
        </span>
      )}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
      <div>
        <label style={lbl}>Sexo</label>
        <select value={sexo} onChange={(e) => setSexo(e.target.value)} style={inp}>
          <option value="">Selecionar</option>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
          <option value="outro">Outro</option>
        </select>
      </div>
      <div>
        <label style={lbl}>Peso (kg)</label>
        <input type="number" min={1} max={300} value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 70" style={inp} />
      </div>
    </div>

    {/* Contato e preferência de atendimento */}
    <p style={sec}>Contato para o atendimento</p>
    <div style={{ marginBottom: 10 }}>
      <label style={lbl}>WhatsApp / Telefone para contato <span style={{ color: '#9ca3af', fontWeight: 400 }}>(o farmacêutico vai usar este número)</span></label>
      <input
        type="tel"
        value={maskWhatsapp(whatsappContato)}
        onChange={(e) => { setWhatsappContato(e.target.value.replace(/\D/g,'')); setWhatsappError(''); }}
        placeholder="(11) 99999-9999"
        style={{ ...inp, borderColor: whatsappError ? '#ef4444' : '#e5e7eb' }}
      />
      {whatsappError && <p style={{ fontSize: 11, color: '#ef4444', margin: '3px 0 0' }}>{whatsappError}</p>}
    </div>
    <div style={{ marginBottom: 14 }}>
      <label style={lbl}>Prefiro ser atendido por</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ val: 'whatsapp', label: '💬 WhatsApp / Telefone' }, { val: 'meet', label: '📹 Vídeo (Google Meet)' }].map(({ val, label }) => (
          <button
            key={val}
            type="button"
            onClick={() => setModalidadeAtend(val)}
            style={{
              flex: 1, padding: '9px 6px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `2px solid ${modalidadeAtend === val ? '#3B9FE0' : '#e5e7eb'}`,
              background: modalidadeAtend === val ? '#EAF6FE' : 'white',
              color: modalidadeAtend === val ? '#3B9FE0' : '#6b7280',
              cursor: 'pointer',
            }}
          >{label}</button>
        ))}
      </div>
    </div>

    {/* Coleta de data de nascimento do titular (quando ausente/inválida) */}
    {selectedPerson === null && perfilCarregado && !perfilTemNasc && (
      <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 16, marginTop: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
          Data de nascimento necessária
        </p>
        <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 10px' }}>
          Informe sua data de nascimento para continuar.
        </p>
        <label style={lbl}>Data de nascimento</label>
        <input
          type="date"
          value={nascInput}
          max={toLocalDateStr()}
          onChange={(e) => { setNascInput(e.target.value); setNascError(''); }}
          style={{ ...inp, marginBottom: 8, borderColor: nascError ? '#ef4444' : '#e5e7eb' }}
        />
        {nascError && <p style={{ fontSize: 11, color: '#ef4444', margin: '-4px 0 8px' }}>{nascError}</p>}
        <button
          type="button"
          onClick={handleSalvarNasc}
          disabled={nascSaving}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
            background: nascSaving ? '#9ca3af' : '#d97706', color: 'white',
            fontSize: 13, fontWeight: 700, cursor: nascSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {nascSaving ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </div>
    )}
  </>
);

export default IdentificacaoContato;
