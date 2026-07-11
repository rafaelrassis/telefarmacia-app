import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatIdade } from '../utils/formatIdade.js';
import { uploadReceitaAnexo, ANEXO_RECEITA_MAX_BYTES, ANEXO_RECEITA_TIPOS_ACEITOS } from '../utils/uploadReceitaAnexo.js';
import { PRECO_CONSULTA } from '../utils/patientDashboardFormat';
import {
  API_URL, toLocalDateStr, calcIdade, validarWhatsapp, maskWhatsapp, sec,
} from './triagem/shared';
import SelecaoDataHorario from './triagem/SelecaoDataHorario';
import { ResultadoLoading, ResultadoSucesso, ResultadoErro } from './triagem/ResultadoTriagem';
import IdentificacaoContato from './triagem/IdentificacaoContato';
import TipoConsulta from './triagem/TipoConsulta';
import SintomasSection from './triagem/SintomasSection';
import HistoricoSection from './triagem/HistoricoSection';
import ReceitaSection from './triagem/ReceitaSection';
import AlertaEmergencia from './triagem/AlertaEmergencia';

const TriagemForm = ({
  tipo = 'urgente',
  modoUrgente = false,
  onBack,
  onConfirm,
  onBooked,
  onAddCredits,
  loading = false,
  pacienteNome = '',
  pacienteIdade = null,
  preSelectedPerson = null,
  dependentes = [],
  initialDate = null,
}) => {
  const isAgendado = tipo === 'agendado';
  const { token } = useAuth();
  const today = toLocalDateStr();
  const [agStep, setAgStep] = useState(isAgendado ? 'select' : 'triagem');
  const [selectedDate, setSelectedDate] = useState(initialDate || today);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [sistemaInfo, setSistemaInfo] = useState(null);
  const [agResult, setAgResult] = useState(null);
  const [agErrorMsg, setAgErrorMsg] = useState('');
  const [agInsuficiente, setAgInsuficiente] = useState(false);

  // ── Pessoa selecionada para a consulta ─────────────────────────────────────
  // null = titular; objeto = dependente
  const [selectedPerson, setSelectedPerson] = useState(preSelectedPerson);

  // ── Dados do perfil do titular (carregados do backend) ─────────────────────
  const [perfilIdade, setPerfilIdade]         = useState(pacienteIdade);
  const [perfilSexo, setPerfilSexo]           = useState('');
  const [perfilPeso, setPerfilPeso]           = useState('');
  const [perfilCarregado, setPerfilCarregado] = useState(false);
  const [perfilTemNasc, setPerfilTemNasc]     = useState(true); // assume válido até carregar
  // ── Coleta de data de nascimento inline (titular sem data válida) ──────────
  const [nascInput, setNascInput]   = useState('');
  const [nascSaving, setNascSaving] = useState(false);
  const [nascError, setNascError]   = useState('');

  useEffect(() => {
    if (!isAgendado) return;
    fetch(`${API_URL}/api/sistema/aberto`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setSistemaInfo(d); }).catch(() => {});
    fetch(`${API_URL}/api/carteira/saldo`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setWalletBalance(d.saldo_disponivel ?? 0); }).catch(() => {});
  }, [isAgendado, token]);

  useEffect(() => {
    if (!isAgendado || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`${API_URL}/api/disponibilidade?data=${selectedDate}`)
      .then(r => r.ok ? r.json() : { slots: [] })
      .then(d => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [isAgendado, selectedDate]);

  // Carrega perfil do titular (inclui telefone para pré-preencher WhatsApp)
  const [perfilTelefone, setPerfilTelefone] = useState('');
  useEffect(() => {
    fetch(`${API_URL}/api/pacientes/perfil`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const sexoVal = d.genero?.toLowerCase() || '';
        setPerfilSexo(sexoVal);
        const idadeCalc = d.data_nascimento ? calcIdade(d.data_nascimento) : null;
        setPerfilIdade(idadeCalc);
        setPerfilTemNasc(idadeCalc !== null);
        if (d.peso)    setPerfilPeso(String(d.peso));
        if (d.telefone) { setPerfilTelefone(d.telefone); setWhatsappContato(d.telefone); }
      })
      .catch(() => {})
      .finally(() => setPerfilCarregado(true));
  }, [token]);

  // ── Contato e modalidade ─────────────────────────────────────────────────────
  const [whatsappContato,  setWhatsappContato]  = useState('');
  const [modalidadeAtend,  setModalidadeAtend]  = useState('whatsapp'); // 'whatsapp' | 'meet'
  const [whatsappError,    setWhatsappError]    = useState('');

  // ── Campos de triagem ────────────────────────────────────────────────────────
  const [sexo, setSexo] = useState('');
  const [peso, setPeso] = useState('');
  const [tipoConsulta, setTipoConsulta] = useState(null);

  const [queixaPrincipal, setQueixaPrincipal] = useState('');
  const [queixaPrefilled, setQueixaPrefilled] = useState(false);
  useEffect(() => {
    if (queixaPrincipal) return;
    const queixaInicial = sessionStorage.getItem('fc_queixa_inicial');
    if (queixaInicial) {
      setQueixaPrincipal(queixaInicial);
      setQueixaPrefilled(true);
      sessionStorage.removeItem('fc_queixa_inicial');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [tempoSintomas, setTempoSintomas] = useState('');
  const [evolucaoSintomas, setEvolucaoSintomas] = useState('');

  const [localizacao, setLocalizacao] = useState('');
  const [intensidade, setIntensidade] = useState(0);
  const [febre, setFebre] = useState(false);
  const [temperatura, setTemperatura] = useState('');
  const [diasFebre, setDiasFebre] = useState('');
  const [diasFebreError, setDiasFebreError] = useState(false);

  const [outrosSintomas, setOutrosSintomas] = useState('');

  const [doencaCronica, setDoencaCronica] = useState(false);
  const [qualDoenca, setQualDoenca] = useState('');
  const [gravidaAmamentando, setGravidaAmamentando] = useState(false);
  const [problemaAnterior, setProblemaAnterior] = useState(false);
  const [acompanhamentoMedico, setAcompanhamentoMedico] = useState(false);
  const [exercicios, setExercicios] = useState(false);

  const [medicamentosAtuais, setMedicamentosAtuais] = useState(false);
  const [quaisMedicamentos, setQuaisMedicamentos] = useState('');
  const [medicamentoProblema, setMedicamentoProblema] = useState(false);
  const [houveMelhora, setHouveMelhora] = useState(false);

  const [alergiasMedicamento, setAlergiasMedicamento] = useState(false);
  const [quaisAlergias, setQuaisAlergias] = useState('');
  const [outrasAlergias, setOutrasAlergias] = useState(false);
  const [quaisOutrasAlergias, setQuaisOutrasAlergias] = useState('');

  const [sinaisAlerta, setSinaisAlerta] = useState([]);

  const [duvidaReceita, setDuvidaReceita] = useState('');
  const [duvidaError, setDuvidaError]     = useState(false);
  const [temReceita, setTemReceita] = useState(false);

  // ── Anexo da receita (interpretação de receita) ────────────────────────────
  const [receitaAnexoFile, setReceitaAnexoFile] = useState(null);
  const [anexoError, setAnexoError] = useState('');

  const handleAnexoChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) { setReceitaAnexoFile(null); setAnexoError(''); return; }
    if (!ANEXO_RECEITA_TIPOS_ACEITOS.includes(file.type)) {
      setAnexoError('Formato não suportado. Use JPG, PNG ou PDF.');
      setReceitaAnexoFile(null);
      e.target.value = '';
      return;
    }
    if (file.size > ANEXO_RECEITA_MAX_BYTES) {
      setAnexoError('Arquivo muito grande (máx. 5MB).');
      setReceitaAnexoFile(null);
      e.target.value = '';
      return;
    }
    setAnexoError('');
    setReceitaAnexoFile(file);
  };

  // Quando muda a pessoa selecionada, atualiza sexo e peso
  useEffect(() => {
    if (selectedPerson === null) {
      // titular
      setSexo(perfilSexo);
      setPeso(perfilPeso);
    } else {
      // dependente
      setSexo(selectedPerson.sexo?.toLowerCase() || '');
      const dadosPeso = selectedPerson.dadosSaude?.peso;
      setPeso(dadosPeso ? String(dadosPeso) : '');
    }
  }, [selectedPerson, perfilSexo, perfilPeso]);

  // Após carregar perfilSexo/perfilPeso, se titular ainda selecionado, prefill
  useEffect(() => {
    if (selectedPerson === null) {
      setSexo(perfilSexo);
      setPeso(perfilPeso);
    }
  }, [perfilSexo, perfilPeso]);

  const pessoaNome = selectedPerson ? selectedPerson.nome : (pacienteNome || '');
  const pessoaIdade = selectedPerson
    ? calcIdade(selectedPerson.dataNascimento)
    : perfilIdade;

  const handleAgendadoConfirm = async (triagem) => {
    setAgStep('loading');
    const data_hora = `${selectedDate}T${selectedSlot}:00`;
    try {
      const res = await fetch(`${API_URL}/api/fila/agendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_hora,
          triagem:          triagem || null,
          dependentId:      selectedPerson?.id ?? undefined,
          whatsapp_contato: triagem?.whatsapp_contato ?? null,
          modalidade_atend: triagem?.modalidade_atend ?? 'whatsapp',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (receitaAnexoFile) {
          try { await uploadReceitaAnexo(token, data.id, 'agendada', receitaAnexoFile); } catch {}
        }
        setAgResult(data); setAgStep('success'); onBooked?.();
      }
      else if (res.status === 402) { setAgInsuficiente(true); setAgErrorMsg(data.error || 'Saldo insuficiente.'); setAgStep('error'); }
      else { setAgErrorMsg(data.error || 'Erro ao realizar agendamento.'); setAgStep('error'); }
    } catch { setAgErrorMsg('Falha de conexão. Tente novamente.'); setAgStep('error'); }
  };

  const saldoOk = walletBalance !== null && walletBalance > 0;

  const temSinais = sinaisAlerta.length > 0;
  const bloqueadoPorAlerta = temSinais;

  const toggleSinal = (s) =>
    setSinaisAlerta((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const handleConfirm = () => {
    if (!tipoConsulta || bloqueadoPorAlerta) return;
    if (tipoConsulta === 'interpretacao_receita' && duvidaReceita.trim().length < 10) {
      setDuvidaError(true);
      return;
    }
    if (tipoConsulta === 'tratamento' && febre && !diasFebre.trim()) {
      setDiasFebreError(true);
      return;
    }
    if (whatsappContato && !validarWhatsapp(whatsappContato)) {
      setWhatsappError('WhatsApp inválido. Informe DDD + número (10 ou 11 dígitos).');
      return;
    }
    setWhatsappError('');
    const isTrat = tipoConsulta === 'tratamento';
    const triagem = {
      dependent_id:             selectedPerson?.id ?? null,
      paciente_nome:            pessoaNome || null,
      paciente_sexo:            sexo || null,
      paciente_idade:           pessoaIdade ?? null,
      paciente_data_nascimento: selectedPerson?.dataNascimento ?? null,
      paciente_peso:   peso ? parseFloat(peso) : null,
      identificacao:   { sexo: sexo || null, peso: peso ? parseFloat(peso) : null },
      tipo_consulta:   tipoConsulta,
      queixa_principal:  isTrat ? queixaPrincipal || null : null,
      tempo_sintomas:    isTrat ? tempoSintomas || null : null,
      evolucao_sintomas: isTrat ? evolucaoSintomas || null : null,
      localizacao:       isTrat ? localizacao || null : null,
      intensidade:       isTrat ? intensidade : null,
      febre:             isTrat ? febre : null,
      temperatura:       (isTrat && febre) ? temperatura || null : null,
      dias_febre:        (isTrat && febre && diasFebre) ? parseInt(diasFebre, 10) : null,
      outros_sintomas:   isTrat ? outrosSintomas || null : null,
      doenca_cronica:    isTrat ? doencaCronica : null,
      qual_doenca:       (isTrat && doencaCronica) ? qualDoenca || null : null,
      gravida_amamentando: isTrat ? gravidaAmamentando : null,
      problema_anterior:   isTrat ? problemaAnterior : null,
      acompanhamento_medico: isTrat ? acompanhamentoMedico : null,
      exercicios:          isTrat ? exercicios : null,
      medicamentos_atuais: medicamentosAtuais,
      quais_medicamentos:  medicamentosAtuais ? quaisMedicamentos || null : null,
      medicamento_problema: medicamentoProblema,
      houve_melhora:       medicamentoProblema ? houveMelhora : null,
      alergia_medicamento: alergiasMedicamento,
      quais_alergias:      alergiasMedicamento ? quaisAlergias || null : null,
      outras_alergias:     outrasAlergias,
      quais_outras_alergias: outrasAlergias ? quaisOutrasAlergias || null : null,
      duvida_receita:   tipoConsulta === 'interpretacao_receita' ? (duvidaReceita.trim() || null) : null,
      sinais_alerta:    isTrat ? sinaisAlerta : [],
      receita_anexo:    isTrat ? temReceita : false,
      whatsapp_contato: whatsappContato ? whatsappContato.replace(/\D/g,'') : null,
      modalidade_atend: modalidadeAtend,
    };
    if (isAgendado) { handleAgendadoConfirm(triagem); } else { onConfirm(triagem, receitaAnexoFile); }
  };

  const handleSalvarNasc = async () => {
    if (!nascInput) { setNascError('Informe uma data válida.'); return; }
    const idadeCalc = calcIdade(nascInput);
    if (idadeCalc === null) { setNascError('Data inválida ou fora do intervalo permitido (0–120 anos).'); return; }
    setNascSaving(true);
    setNascError('');
    try {
      const res = await fetch(`${API_URL}/api/pacientes/perfil`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_nascimento: nascInput }),
      });
      if (res.ok) {
        setPerfilIdade(idadeCalc);
        setPerfilTemNasc(true);
      } else {
        const err = await res.json().catch(() => ({}));
        setNascError(err.error || 'Erro ao salvar data de nascimento.');
      }
    } catch {
      setNascError('Falha de conexão. Tente novamente.');
    } finally {
      setNascSaving(false);
    }
  };

  const handleAbortoAlerta = () => {
    fetch(`${API_URL}/api/fila/urgente/aborto-triagem`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo: 'sinais_alerta',
        sinais: sinaisAlerta,
        dependentId: selectedPerson?.id ?? undefined,
      }),
    }).catch(() => {});
    onBack();
  };

  // ── Wizard de 4 passos ───────────────────────────────────────────────────
  // 1: Para quem + contato · 2: Motivo · 3: Detalhes por tipo · 4: Histórico + Revisão
  const [wizardStep, setWizardStep] = useState(1);
  const STEP_TITLES = {
    1: 'Para quem é a consulta?',
    2: 'Qual é o motivo?',
    3: 'Detalhes da consulta',
    4: 'Histórico e revisão',
  };
  const TIPO_LABEL = {
    tratamento: 'Orientação de tratamento',
    interpretacao_receita: 'Interpretação de receita',
  };

  const validarPasso = (step) => {
    if (step === 1) {
      if (whatsappContato && !validarWhatsapp(whatsappContato)) {
        setWhatsappError('WhatsApp inválido. Informe DDD + número (10 ou 11 dígitos).');
        return false;
      }
      setWhatsappError('');
      return true;
    }
    if (step === 2) {
      return Boolean(tipoConsulta);
    }
    if (step === 3) {
      if (tipoConsulta === 'interpretacao_receita' && duvidaReceita.trim().length < 10) {
        setDuvidaError(true);
        return false;
      }
      if (tipoConsulta === 'tratamento' && febre && !diasFebre.trim()) {
        setDiasFebreError(true);
        return false;
      }
      return true;
    }
    return true;
  };

  const handleContinuarWizard = () => {
    if (!validarPasso(wizardStep)) return;
    setWizardStep((s) => Math.min(4, s + 1));
  };

  const handleVoltarWizard = () => {
    if (wizardStep === 1) {
      if (isAgendado) setAgStep('select'); else onBack();
      return;
    }
    setWizardStep((s) => Math.max(1, s - 1));
  };

  if (isAgendado && agStep === 'select') return (
    <SelecaoDataHorario
      onBack={onBack}
      sistemaInfo={sistemaInfo}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      today={today}
      loadingSlots={loadingSlots}
      slots={slots}
      selectedSlot={selectedSlot}
      setSelectedSlot={setSelectedSlot}
      walletBalance={walletBalance}
      saldoOk={saldoOk}
      onAddCredits={onAddCredits}
      onProximo={() => setAgStep('triagem')}
    />
  );

  if (isAgendado && agStep === 'loading') return <ResultadoLoading />;

  if (isAgendado && agStep === 'success') return (
    <ResultadoSucesso agResult={agResult} onFechar={onBack} />
  );

  if (isAgendado && agStep === 'error') return (
    <ResultadoErro
      agInsuficiente={agInsuficiente}
      agErrorMsg={agErrorMsg}
      onAddCredits={onAddCredits}
      onTentarNovamente={() => { setAgStep('select'); setAgErrorMsg(''); setAgInsuficiente(false); }}
    />
  );

  const resumoQueixa = tipoConsulta === 'tratamento' ? queixaPrincipal : duvidaReceita;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', position: 'relative' }}>
      {/* Progress bar segmentada */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 24px 0', flexShrink: 0 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= wizardStep ? '#3B9FE0' : '#e5e7eb' }} />
        ))}
      </div>

      {/* Header */}
      <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{STEP_TITLES[wizardStep]}</h2>
          <span style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
            Passo {wizardStep} de 4
          </span>
        </div>
        {(pessoaNome || pessoaIdade !== null) && (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
            {pessoaNome}
            {pessoaNome && (selectedPerson?.dataNascimento || pessoaIdade !== null) ? ' · ' : ''}
            {selectedPerson?.dataNascimento
              ? formatIdade(selectedPerson.dataNascimento)
              : pessoaIdade !== null ? `${pessoaIdade} anos` : ''}
          </p>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 16px' }}>

        {wizardStep === 1 && (
          <IdentificacaoContato
            pacienteNome={pacienteNome}
            dependentes={dependentes}
            selectedPerson={selectedPerson}
            setSelectedPerson={setSelectedPerson}
            pessoaNome={pessoaNome}
            pessoaIdade={pessoaIdade}
            sexo={sexo} setSexo={setSexo}
            peso={peso} setPeso={setPeso}
            whatsappContato={whatsappContato} setWhatsappContato={setWhatsappContato}
            whatsappError={whatsappError} setWhatsappError={setWhatsappError}
            modalidadeAtend={modalidadeAtend} setModalidadeAtend={setModalidadeAtend}
            perfilCarregado={perfilCarregado}
            perfilTemNasc={perfilTemNasc}
            nascInput={nascInput} setNascInput={setNascInput}
            nascError={nascError} setNascError={setNascError}
            nascSaving={nascSaving} handleSalvarNasc={handleSalvarNasc}
          />
        )}

        {wizardStep === 2 && (
          <TipoConsulta tipoConsulta={tipoConsulta} setTipoConsulta={setTipoConsulta} />
        )}

        {wizardStep === 3 && (
          <>
            {tipoConsulta === 'tratamento' && (
              <SintomasSection
                queixaPrincipal={queixaPrincipal} setQueixaPrincipal={setQueixaPrincipal}
                queixaPrefilled={queixaPrefilled}
                tempoSintomas={tempoSintomas} setTempoSintomas={setTempoSintomas}
                evolucaoSintomas={evolucaoSintomas} setEvolucaoSintomas={setEvolucaoSintomas}
                localizacao={localizacao} setLocalizacao={setLocalizacao}
                intensidade={intensidade} setIntensidade={setIntensidade}
                febre={febre} setFebre={setFebre}
                temperatura={temperatura} setTemperatura={setTemperatura}
                diasFebre={diasFebre} setDiasFebre={setDiasFebre}
                diasFebreError={diasFebreError} setDiasFebreError={setDiasFebreError}
                outrosSintomas={outrosSintomas} setOutrosSintomas={setOutrosSintomas}
                sinaisAlerta={sinaisAlerta} toggleSinal={toggleSinal}
              />
            )}
            <ReceitaSection
              tipoConsulta={tipoConsulta}
              temReceita={temReceita} setTemReceita={setTemReceita}
              duvidaReceita={duvidaReceita} setDuvidaReceita={setDuvidaReceita}
              duvidaError={duvidaError} setDuvidaError={setDuvidaError}
              handleAnexoChange={handleAnexoChange} anexoError={anexoError} receitaAnexoFile={receitaAnexoFile}
            />
          </>
        )}

        {wizardStep === 4 && (
          <>
            <HistoricoSection
              isTratamento={tipoConsulta === 'tratamento'}
              doencaCronica={doencaCronica} setDoencaCronica={setDoencaCronica}
              qualDoenca={qualDoenca} setQualDoenca={setQualDoenca}
              gravidaAmamentando={gravidaAmamentando} setGravidaAmamentando={setGravidaAmamentando}
              problemaAnterior={problemaAnterior} setProblemaAnterior={setProblemaAnterior}
              acompanhamentoMedico={acompanhamentoMedico} setAcompanhamentoMedico={setAcompanhamentoMedico}
              exercicios={exercicios} setExercicios={setExercicios}
              medicamentosAtuais={medicamentosAtuais} setMedicamentosAtuais={setMedicamentosAtuais}
              quaisMedicamentos={quaisMedicamentos} setQuaisMedicamentos={setQuaisMedicamentos}
              medicamentoProblema={medicamentoProblema} setMedicamentoProblema={setMedicamentoProblema}
              houveMelhora={houveMelhora} setHouveMelhora={setHouveMelhora}
              alergiasMedicamento={alergiasMedicamento} setAlergiasMedicamento={setAlergiasMedicamento}
              quaisAlergias={quaisAlergias} setQuaisAlergias={setQuaisAlergias}
              outrasAlergias={outrasAlergias} setOutrasAlergias={setOutrasAlergias}
              quaisOutrasAlergias={quaisOutrasAlergias} setQuaisOutrasAlergias={setQuaisOutrasAlergias}
            />

            {/* Revisão */}
            <p style={sec}>Revisão</p>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>Paciente</span>
                <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{pessoaNome || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>Motivo</span>
                <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{TIPO_LABEL[tipoConsulta] || '—'}</span>
              </div>
              {resumoQueixa && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span style={{ color: '#6b7280', flexShrink: 0 }}>{tipoConsulta === 'tratamento' ? 'Queixa' : 'Dúvida'}</span>
                  <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                    {resumoQueixa.length > 80 ? `${resumoQueixa.slice(0, 80)}…` : resumoQueixa}
                  </span>
                </div>
              )}
              {isAgendado && selectedSlot && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>Data e horário</span>
                  <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')} às {selectedSlot}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>Custo</span>
                <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                  R$ {PRECO_CONSULTA.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {whatsappContato && (
              <div style={{ background: '#EAF6FE', border: '1px solid #8ED2F6', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
                <p style={{ fontSize: 13, color: '#1D74B8', margin: 0 }}>
                  Vamos te chamar no WhatsApp <strong>{maskWhatsapp(whatsappContato)}</strong>.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: 16, background: 'white', flexShrink: 0, borderRadius: '0 0 16px 16px' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleVoltarWizard}
            disabled={loading}
            style={{
              padding: '11px 20px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: 'white', color: '#374151', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
            }}
          >
            ← Voltar
          </button>
          {wizardStep < 4 ? (
            <button
              type="button"
              onClick={handleContinuarWizard}
              disabled={(wizardStep === 2 && !tipoConsulta) || loading}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                background: ((wizardStep === 2 && !tipoConsulta) || loading) ? '#9ca3af' : '#3B9FE0',
                color: 'white', fontSize: 15, fontWeight: 700,
                cursor: ((wizardStep === 2 && !tipoConsulta) || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!tipoConsulta || loading}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                background: (!tipoConsulta || loading) ? '#9ca3af' : (modoUrgente ? '#dc2626' : '#3B9FE0'),
                color: 'white', fontSize: 15, fontWeight: 700,
                cursor: (!tipoConsulta || loading) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Aguarde...' : modoUrgente ? 'Confirmar atendimento urgente' : 'Confirmar consulta'}
            </button>
          )}
        </div>
      </div>

      {/* Hard block overlay — sinais de alerta marcados */}
      {temSinais && <AlertaEmergencia onFechar={handleAbortoAlerta} />}
    </div>
  );
};

export default TriagemForm;
