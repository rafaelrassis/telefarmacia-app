import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatIdade } from '../utils/formatIdade.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const toLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

const calcIdade = (dataNascimento) => {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  ) idade--;
  if (idade < 0 || idade > 120) return null;
  return idade;
};

const SINAIS_ALERTA = [
  'Falta de ar',
  'Dor intensa',
  'Sangramento',
  'Febre alta persistente',
  'Desmaio',
  'Convulsão',
  'Alteração do nível de consciência',
  'Sintomas em criança pequena, gestante ou idoso',
];

const PARENTESCO_LABEL = {
  filho_a: 'Filho(a)',
  conjuge: 'Cônjuge',
  pai_mae: 'Pai/Mãe',
  irmao_a: 'Irmão(ã)',
  outro: 'Outro',
};

const DEP_COLORS = [
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-indigo-400 to-blue-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-purple-500',
];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const inp = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '8px 12px', fontSize: 14, color: '#111827',
  fontFamily: 'inherit', outline: 'none', background: 'white',
};
const area = { ...inp, resize: 'vertical', minHeight: 72 };
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 };
const sec = {
  fontSize: 13, fontWeight: 700, color: '#374151',
  margin: '20px 0 12px', borderBottom: '1px solid #f3f4f6', paddingBottom: 8,
};

const Toggle = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
    <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? '#2563eb' : '#d1d5db',
        border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        transition: 'left 0.15s',
      }} />
    </button>
  </div>
);

const Slider = ({ value, onChange, label }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={lbl}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>{value}/10</span>
    </div>
    <input
      type="range" min={0} max={10} value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      style={{ width: '100%', accentColor: '#2563eb' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
      <span>Sem desconforto</span>
      <span>Insuportável</span>
    </div>
  </div>
);

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

  const maskWhatsapp = (v) =>
    v.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');

  const validarWhatsapp = (v) => {
    const digits = v.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  };

  // ── Campos de triagem ────────────────────────────────────────────────────────
  const [sexo, setSexo] = useState('');
  const [peso, setPeso] = useState('');
  const [tipoConsulta, setTipoConsulta] = useState(null);

  const [queixaPrincipal, setQueixaPrincipal] = useState('');
  const [tempoSintomas, setTempoSintomas] = useState('');
  const [evolucaoSintomas, setEvolucaoSintomas] = useState('');

  const [localizacao, setLocalizacao] = useState('');
  const [intensidade, setIntensidade] = useState(0);
  const [febre, setFebre] = useState(false);
  const [temperatura, setTemperatura] = useState('');

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
      if (res.ok) { setAgResult(data); setAgStep('success'); onBooked?.(); }
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
    if (isAgendado) { handleAgendadoConfirm(triagem); } else { onConfirm(triagem); }
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

  const btnTipo = (val, label) => (
    <button
      type="button"
      onClick={() => setTipoConsulta(val)}
      style={{
        flex: 1, padding: '12px 8px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: `2px solid ${tipoConsulta === val ? '#2563eb' : '#e5e7eb'}`,
        background: tipoConsulta === val ? '#eff6ff' : 'white',
        color: tipoConsulta === val ? '#1d4ed8' : '#374151',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  // ── Chip seletor dentro da triagem ─────────────────────────────────────────
  const renderPessoaSelector = () => {
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
              border: selectedPerson === null ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
              background: selectedPerson === null ? '#f5f3ff' : 'white',
              color: selectedPerson === null ? '#5b21b6' : '#374151',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {initials(pacienteNome)}
            </span>
            {pacienteNome?.split(' ')[0] || 'Eu'}
            <span style={{ fontSize: 10, color: selectedPerson === null ? '#7c3aed' : '#9ca3af' }}>(eu)</span>
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
                  border: isSelected ? '2px solid #7c3aed' : '1.5px solid #e5e7eb',
                  background: isSelected ? '#f5f3ff' : 'white',
                  color: isSelected ? '#5b21b6' : '#374151',
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
                  <span style={{ fontSize: 10, color: isSelected ? '#7c3aed' : '#9ca3af' }}>
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

  if (isAgendado && agStep === 'select') return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, color: '#111827', fontSize: 18, margin: 0 }}>Agendar Consulta</h2>
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1, width: 32, height: 32, borderRadius: '50%' }}>×</button>
        </div>
        {sistemaInfo && !sistemaInfo.aberto && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, color: '#991b1b', margin: '0 0 4px', fontSize: 14 }}>Sistema fechado no momento</p>
            <p style={{ color: '#dc2626', margin: 0, fontSize: 13 }}>{sistemaInfo.motivo}</p>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Data da consulta</label>
          <input type="date" value={selectedDate} min={today} onChange={e => setSelectedDate(e.target.value)}
            style={{ ...inp, borderRadius: 12, padding: '10px 12px' }} />
        </div>
        <label style={lbl}>Horário disponível</label>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, maxHeight: 300, padding: '0 24px 8px' }}>
        {loadingSlots ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%' }} />
          </div>
        ) : slots.length === 0 ? (
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: '20px 0', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Sem horários disponíveis nesta data.</p>
            <p style={{ color: '#d1d5db', fontSize: 12, margin: '4px 0 0' }}>Tente outra data.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {slots.map(hora => (
              <button key={hora} onClick={() => setSelectedSlot(hora)} style={selectedSlot === hora ? {
                background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12,
                padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              } : {
                background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>{hora}</button>
            ))}
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', padding: 16, background: 'white', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>Seu saldo</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: walletBalance === null ? '#9ca3af' : saldoOk ? '#059669' : '#ef4444' }}>
            {walletBalance === null ? '...' : `R$ ${walletBalance.toFixed(2).replace('.', ',')}`}
          </span>
        </div>
        {walletBalance !== null && !saldoOk && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 12, textAlign: 'center' }}>
            <p style={{ fontWeight: 600, color: '#991b1b', margin: '0 0 2px', fontSize: 14 }}>Saldo insuficiente</p>
            <button onClick={onAddCredits} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              Adicionar créditos à carteira
            </button>
          </div>
        )}
        {selectedSlot && (
          <button onClick={() => setAgStep('triagem')} disabled={!saldoOk} style={{
            background: saldoOk ? '#2563eb' : '#9ca3af', color: 'white', padding: 12, width: '100%',
            borderRadius: 8, border: 'none', fontSize: 15, fontWeight: 'bold',
            cursor: saldoOk ? 'pointer' : 'not-allowed', marginBottom: 8, display: 'block',
          }}>
            Próximo → Triagem ({selectedSlot})
          </button>
        )}
        <button onClick={onBack} style={{
          width: '100%', padding: 10, background: 'transparent', border: '1px solid #e5e7eb',
          borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#6b7280', cursor: 'pointer', display: 'block',
        }}>Cancelar</button>
      </div>
    </div>
  );

  if (isAgendado && agStep === 'loading') return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ width: 40, height: 40, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} />
      <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: 0 }}>Realizando agendamento...</p>
    </div>
  );

  if (isAgendado && agStep === 'success') return (
    <div style={{ textAlign: 'center', padding: '32px 24px' }}>
      <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 style={{ fontWeight: 700, color: '#111827', fontSize: 18, margin: '0 0 8px' }}>Consulta agendada!</h2>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Um farmacêutico aceitará sua consulta em breve.</p>
      {agResult && (
        <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: '#6b7280' }}>Data e hora</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>
              {new Date(agResult.data_hora).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {agResult.preco_cobrado && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: '#6b7280' }}>Valor debitado</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>R$ {Number(agResult.preco_cobrado).toFixed(2).replace('.', ',')}</span>
            </div>
          )}
        </div>
      )}
      <button onClick={onBack} style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 700, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
        Fechar
      </button>
    </div>
  );

  if (isAgendado && agStep === 'error') return (
    <div style={{ textAlign: 'center', padding: '32px 24px' }}>
      <div style={{ width: 56, height: 56, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h2 style={{ fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{agInsuficiente ? 'Saldo insuficiente' : 'Erro no agendamento'}</h2>
      <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 20px' }}>{agErrorMsg}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        {agInsuficiente && (
          <button onClick={onAddCredits} style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
            Adicionar créditos
          </button>
        )}
        <button onClick={() => { setAgStep('select'); setAgErrorMsg(''); setAgInsuficiente(false); }} style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer', background: 'white', color: '#374151' }}>
          Tentar novamente
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', position: 'relative' }}>
      {/* Progress bar */}
      <div style={{ height: 4, background: '#e5e7eb', flexShrink: 0, borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', background: '#2563eb' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Ficha de Triagem</h2>
          <span style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
            Etapa 2 de 2
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

        {/* Seletor de perfil (só aparece se há dependentes) */}
        {dependentes.filter(d => d.ativo).length > 0 && (
          <>
            <p style={sec}>Para quem é a consulta?</p>
            {renderPessoaSelector()}
          </>
        )}

        {/* 1. Identificação */}
        <p style={sec}>1. Identificação</p>
        {/* Nome exibido como readonly */}
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
                  border: `2px solid ${modalidadeAtend === val ? '#7c3aed' : '#e5e7eb'}`,
                  background: modalidadeAtend === val ? '#f5f3ff' : 'white',
                  color: modalidadeAtend === val ? '#7c3aed' : '#6b7280',
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

        {/* Objetivo */}
        <p style={sec}>Objetivo da consulta</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {btnTipo('tratamento', '💊 Orientação de tratamento')}
          {btnTipo('interpretacao_receita', '🔍 Interpretação de receita')}
        </div>

        {/* Sections 2–4: only for 'tratamento' */}
        {tipoConsulta === 'tratamento' && (
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
                      border: `1px solid ${evolucaoSintomas === op.toLowerCase() ? '#2563eb' : '#e5e7eb'}`,
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
                <label style={lbl}>Temperatura (°C)</label>
                <input type="text" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="Ex: 38,5" style={inp} />
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={lbl}>Outros sintomas associados</label>
              <textarea value={outrosSintomas} onChange={(e) => setOutrosSintomas(e.target.value)} placeholder="Náusea, cansaço, tontura..." style={area} />
            </div>

            <p style={sec}>4. Histórico de saúde</p>
            <Toggle value={doencaCronica} onChange={setDoencaCronica} label="Doença crônica?" />
            {doencaCronica && (
              <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
                <textarea value={qualDoenca} onChange={(e) => setQualDoenca(e.target.value)} placeholder="Diabetes, hipertensão, asma..." style={area} />
              </div>
            )}
            <Toggle value={gravidaAmamentando} onChange={setGravidaAmamentando} label="Grávida ou amamentando?" />
            <Toggle value={problemaAnterior} onChange={setProblemaAnterior} label="Já teve esse problema antes?" />
            <Toggle value={acompanhamentoMedico} onChange={setAcompanhamentoMedico} label="Em acompanhamento médico?" />
            <Toggle value={exercicios} onChange={setExercicios} label="Pratica exercícios físicos?" />
          </>
        )}

        {/* Sections 5–8: shown when any objective is selected */}
        {tipoConsulta && (
          <>
            {/* Section 5: Medicamentos — both objectives */}
            <p style={sec}>5. Uso de medicamentos</p>
            <Toggle value={medicamentosAtuais} onChange={setMedicamentosAtuais} label="Usa algum medicamento atualmente?" />
            {medicamentosAtuais && (
              <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
                <textarea value={quaisMedicamentos} onChange={(e) => setQuaisMedicamentos(e.target.value)} placeholder="Nome dos medicamentos..." style={area} />
              </div>
            )}
            <Toggle value={medicamentoProblema} onChange={setMedicamentoProblema} label="Usou medicamento para esse problema?" />
            {medicamentoProblema && (
              <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4 }}>
                <Toggle value={houveMelhora} onChange={setHouveMelhora} label="Houve melhora?" />
              </div>
            )}

            {/* Section 6: Alergias — both objectives */}
            <p style={sec}>6. Alergias</p>
            <Toggle value={alergiasMedicamento} onChange={setAlergiasMedicamento} label="Alergia a medicamentos?" />
            {alergiasMedicamento && (
              <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
                <textarea value={quaisAlergias} onChange={(e) => setQuaisAlergias(e.target.value)} placeholder="Quais medicamentos?" style={area} />
              </div>
            )}
            <Toggle value={outrasAlergias} onChange={setOutrasAlergias} label="Outras alergias?" />
            {outrasAlergias && (
              <div style={{ paddingLeft: 16, borderLeft: '2px solid #e5e7eb', marginTop: 4, marginBottom: 8 }}>
                <textarea value={quaisOutrasAlergias} onChange={(e) => setQuaisOutrasAlergias(e.target.value)} placeholder="Alimentos, animais, materiais..." style={area} />
              </div>
            )}

            {/* Section 7: Sinais de alerta — tratamento only */}
            {tipoConsulta === 'tratamento' && (
              <>
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
            )}

            {/* Section 8: Receita (tratamento) */}
            {tipoConsulta === 'tratamento' && (
              <>
                <p style={sec}>8. Receita</p>
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

            {/* Section 8: Dúvida sobre a receita (interpretacao_receita) */}
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
                <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
                    Tenha a receita em mãos (física ou foto) para mostrar ao farmacêutico durante o atendimento.
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {!tipoConsulta && (
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 20, textAlign: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
              Selecione o objetivo da consulta acima para continuar.
            </p>
          </div>
        )}
      </div>

      {/* Fixed footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: 16, background: 'white', flexShrink: 0, borderRadius: '0 0 16px 16px' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={isAgendado ? () => setAgStep('select') : onBack}
            disabled={loading}
            style={{
              padding: '11px 20px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: 'white', color: '#374151', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
            }}
          >
            ← Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!tipoConsulta || loading}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
              background: (!tipoConsulta || loading) ? '#9ca3af' : (modoUrgente ? '#dc2626' : '#2563eb'),
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: (!tipoConsulta || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Aguarde...' : modoUrgente ? 'Confirmar atendimento urgente' : 'Confirmar agendamento'}
          </button>
        </div>
      </div>

      {/* Hard block overlay — sinais de alerta marcados */}
      {temSinais && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(127,29,29,0.97)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px', borderRadius: 16, zIndex: 10,
        }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>🚨</div>
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: '0 0 12px', textAlign: 'center' }}>
            Procure atendimento presencial imediatamente
          </h3>
          <p style={{ color: '#fca5a5', fontSize: 14, textAlign: 'center', lineHeight: 1.5, margin: '0 0 8px' }}>
            Os sintomas informados indicam uma situação que{' '}
            <strong style={{ color: 'white' }}>não pode ser tratada por teleconsulta</strong>.
          </p>
          <p style={{ color: '#fca5a5', fontSize: 14, textAlign: 'center', lineHeight: 1.5, margin: '0 0 28px' }}>
            Ligue imediatamente para o{' '}
            <strong style={{ color: 'white', fontSize: 17 }}>SAMU (192)</strong>{' '}
            ou vá ao pronto-socorro mais próximo.
          </p>
          <button
            type="button"
            onClick={handleAbortoAlerta}
            style={{
              width: '100%', maxWidth: 280, padding: '13px 0', borderRadius: 8, border: 'none',
              background: 'white', color: '#7f1d1d', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Fechar e cancelar
          </button>
        </div>
      )}
    </div>
  );
};

export default TriagemForm;
