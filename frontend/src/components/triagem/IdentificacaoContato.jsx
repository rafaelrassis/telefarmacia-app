import React from 'react';
import { MessageCircle, Video } from 'lucide-react';
import { formatIdade } from '../../utils/formatIdade.js';
import {
  inp, lbl, sec, inpError, initials, maskWhatsapp, toLocalDateStr,
  PARENTESCO_LABEL, DEP_COLORS,
} from './shared';

const PessoaSelector = ({ pacienteNome, dependentes, selectedPerson, setSelectedPerson }) => {
  const todosAtivos = dependentes.filter(d => d.ativo);
  if (todosAtivos.length === 0) return null;

  return (
    <div className="mb-1">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {/* Titular */}
        <button
          type="button"
          onClick={() => setSelectedPerson(null)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 border-2 ${
            selectedPerson === null ? 'border-brand bg-brand-wash text-brand-deep font-bold' : 'border-line bg-canvas text-ink font-medium'
          }`}
        >
          <span className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center text-[7px] font-bold text-white shrink-0">
            {initials(pacienteNome)}
          </span>
          {pacienteNome?.split(' ')[0] || 'Eu'}
          <span className={`text-[10px] ${selectedPerson === null ? 'text-brand' : 'text-muted'}`}>(eu)</span>
        </button>

        {/* Dependentes */}
        {todosAtivos.map((dep, idx) => {
          const isSelected = selectedPerson?.id === dep.id;
          return (
            <button
              key={dep.id}
              type="button"
              onClick={() => setSelectedPerson(dep)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 border-2 ${
                isSelected ? 'border-brand bg-brand-wash text-brand-deep font-bold' : 'border-line bg-canvas text-ink font-medium'
              }`}
            >
              <span className={`w-[18px] h-[18px] rounded-full bg-gradient-to-br ${DEP_COLORS[idx % DEP_COLORS.length]} flex items-center justify-center text-[7px] font-bold text-white shrink-0`}>
                {initials(dep.nome)}
              </span>
              {dep.nome.split(' ')[0]}
              {(dep.parentesco || dep.dataNascimento) && (
                <span className={`text-[10px] ${isSelected ? 'text-brand' : 'text-muted'}`}>
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
        <p className={sec}>Para quem é a consulta?</p>
        <PessoaSelector pacienteNome={pacienteNome} dependentes={dependentes} selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} />
      </>
    )}

    {/* Identificação */}
    <p className={sec}>Identificação</p>
    <div className="mb-3 px-3 py-2 bg-surface rounded-lg border border-line">
      <span className="text-xs text-muted block mb-0.5">Paciente</span>
      <span className="text-sm font-semibold text-ink">{pessoaNome || '—'}</span>
      {(selectedPerson?.dataNascimento || pessoaIdade !== null) && (
        <span className="text-[13px] text-muted ml-2">
          {selectedPerson?.dataNascimento
            ? formatIdade(selectedPerson.dataNascimento)
            : `${pessoaIdade} anos`}
        </span>
      )}
    </div>
    <div className="grid grid-cols-2 gap-3 mb-3">
      <div>
        <label className={lbl}>Sexo</label>
        <select value={sexo} onChange={(e) => setSexo(e.target.value)} className={inp}>
          <option value="">Selecionar</option>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
          <option value="outro">Outro</option>
        </select>
      </div>
      <div>
        <label className={lbl}>Peso (kg)</label>
        <input type="number" min={1} max={300} value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 70" className={inp} />
      </div>
    </div>

    {/* Contato e preferência de atendimento */}
    <p className={sec}>Contato para o atendimento</p>
    <div className="mb-2.5">
      <label className={lbl}>WhatsApp / Telefone para contato <span className="text-muted font-normal">(o farmacêutico vai usar este número)</span></label>
      <input
        type="tel"
        value={maskWhatsapp(whatsappContato)}
        onChange={(e) => { setWhatsappContato(e.target.value.replace(/\D/g,'')); setWhatsappError(''); }}
        placeholder="(11) 99999-9999"
        className={whatsappError ? inpError : inp}
      />
      {whatsappError && <p className="text-[11px] text-error mt-1">{whatsappError}</p>}
    </div>
    <div className="mb-3.5">
      <label className={lbl}>Prefiro ser atendido por</label>
      <div className="flex gap-2">
        {[{ val: 'whatsapp', label: 'WhatsApp / Telefone', Icon: MessageCircle }, { val: 'meet', label: 'Vídeo (Google Meet)', Icon: Video }].map(({ val, label, Icon }) => {
          const selecionado = modalidadeAtend === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => setModalidadeAtend(val)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
                selecionado ? 'border-brand bg-brand-wash text-brand-deep' : 'border-line bg-canvas text-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
              {label}
            </button>
          );
        })}
      </div>
    </div>

    {/* Coleta de data de nascimento do titular (quando ausente/inválida) */}
    {selectedPerson === null && perfilCarregado && !perfilTemNasc && (
      <div className="bg-alert-wash border border-alert/30 rounded-xl p-4 mb-4 mt-2">
        <p className="text-sm font-bold text-alert mb-1">
          Data de nascimento necessária
        </p>
        <p className="text-[13px] text-alert mb-2.5">
          Informe sua data de nascimento para continuar.
        </p>
        <label className={lbl}>Data de nascimento</label>
        <input
          type="date"
          value={nascInput}
          max={toLocalDateStr()}
          onChange={(e) => { setNascInput(e.target.value); setNascError(''); }}
          className={`${nascError ? inpError : inp} mb-2`}
        />
        {nascError && <p className="text-[11px] text-error -mt-1 mb-2">{nascError}</p>}
        <button
          type="button"
          onClick={handleSalvarNasc}
          disabled={nascSaving}
          className="w-full py-2.5 rounded-lg border-none bg-alert text-white text-[13px] font-bold disabled:opacity-60"
        >
          {nascSaving ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </div>
    )}
  </>
);

export default IdentificacaoContato;
