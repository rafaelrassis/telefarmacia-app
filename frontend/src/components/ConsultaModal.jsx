import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_LABELS = {
  aguardando:     { label: 'Aguardando farmacêutico', cls: 'text-gray-600 bg-gray-100' },
  aceito:         { label: 'Confirmado',              cls: 'text-blue-700 bg-blue-100' },
  em_atendimento: { label: 'Em atendimento',          cls: 'text-green-700 bg-green-100' },
  concluido:      { label: 'Concluído',               cls: 'text-violet-700 bg-violet-100' },
  cancelado:      { label: 'Cancelado',               cls: 'text-red-700 bg-red-100' },
};

const fmtElapsed = (s) => {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}h ` : ''}${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
};

const emptyMed = () => ({ medicamento: '', dosagem: '', posologia: '', duracao: '' });

const truncate = (text, max = 80) => {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}...`;
};

// ── Modal de detalhe do histórico ─────────────────────────────────────────────

const HistoricoDetalheModal = ({ item, onClose }) => {
  if (!item) return null;

  const dataFmt = new Date(item.dataHora).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const tipoBadge = item.tipo === 'urgente' ? '🔴 Urgente' : '📅 Agendada';
  const isConcluido = item.status === 'concluido';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-base">Atendimento anterior</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-xl"
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Meta */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                {tipoBadge}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isConcluido ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'
              }`}>
                {isConcluido ? 'Concluído' : 'Cancelado'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{dataFmt}</p>
            {item.farmaceuticoNome && (
              <p className="text-xs text-gray-500">
                Farmacêutico(a): <span className="font-semibold text-gray-700">{item.farmaceuticoNome}</span>
              </p>
            )}
          </div>

          {/* Motivo */}
          {item.motivo && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Motivo / Queixa principal</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{item.motivo}</p>
            </div>
          )}

          {/* Observações */}
          {item.observacoes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Observações do atendimento</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{item.observacoes}</p>
            </div>
          )}

          {!item.motivo && !item.observacoes && (
            <p className="text-sm text-gray-400 italic text-center py-2">Sem registros clínicos para este atendimento.</p>
          )}

          {/* Finalização */}
          {item.finalizacao && (
            <FinalizacaoSection readonly data={item.finalizacao}
              problemaAutolimitado={null} pacienteCompreendeu={null}
              contraindicacao={null} contraindicacaoDetalhe=""
              encaminhamentoMedico={null} encaminhamentoDetalhe=""
            />
          )}

          {/* Receita */}
          {Array.isArray(item.receita) && item.receita.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">💊 Receita farmacêutica</p>
              <div className="space-y-2">
                {item.receita.map((med, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 text-xs space-y-0.5">
                    <p className="font-semibold text-gray-800 text-sm">
                      {i + 1}. {med.medicamento}{med.dosagem ? `  ${med.dosagem}` : ''}
                    </p>
                    {med.posologia && <p className="text-gray-600">Posologia: {med.posologia}</p>}
                    {med.duracao   && <p className="text-gray-600">Duração: {med.duracao}</p>}
                  </div>
                ))}
              </div>

              {item.receitaPdfUrl && (
                <a
                  href={`${API_URL}${item.receitaPdfUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-50 transition"
                >
                  📄 Baixar receita em PDF
                </a>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-700"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

const SINAIS_LABEL = {
  queixa_principal: 'Queixa principal',
  tempo_sintomas: 'Duração dos sintomas',
  evolucao_sintomas: 'Evolução dos sintomas',
  localizacao: 'Localização',
  outros_sintomas: 'Outros sintomas',
  qual_doenca: 'Doença crônica',
  quais_medicamentos: 'Medicamentos em uso',
  quais_alergias: 'Alergias a medicamentos',
  quais_outras_alergias: 'Outras alergias',
  temperatura: 'Temperatura',
};

const RELACAO_LABEL = { filho_a: 'filho(a)', conjuge: 'cônjuge', pai_mae: 'pai/mãe', outro: 'outro' };

const TriagemDisplay = ({ triagem, solicitanteNome }) => {
  const rows = [];

  if (triagem.para_quem) {
    const nome = triagem.paciente_nome || '—';
    const idadeStr = triagem.paciente_idade ? `, ${triagem.paciente_idade} anos` : '';
    const relStr = triagem.paciente_relacao ? ` (${RELACAO_LABEL[triagem.paciente_relacao] || triagem.paciente_relacao})` : '';
    if (triagem.para_quem === 'eu') {
      rows.push({ label: 'Consulta para', value: `${nome} (para si mesmo)` });
    } else {
      const sol = solicitanteNome ? ` — solicitada por ${solicitanteNome}` : '';
      rows.push({ label: 'Consulta para', value: `${nome}${idadeStr}${relStr}${sol}` });
    }
  }

  if (triagem.tipo_consulta) rows.push({ label: 'Tipo de consulta', value: triagem.tipo_consulta === 'tratamento' ? 'Orientação de tratamento' : 'Tirar dúvida' });
  if (triagem.identificacao?.sexo) rows.push({ label: 'Sexo', value: triagem.identificacao.sexo });
  if (triagem.identificacao?.peso) rows.push({ label: 'Peso', value: `${triagem.identificacao.peso} kg` });

  const textFields = ['queixa_principal','tempo_sintomas','evolucao_sintomas','localizacao','outros_sintomas','quais_medicamentos','qual_doenca','temperatura','quais_alergias','quais_outras_alergias'];
  textFields.forEach((k) => {
    if (triagem[k]) rows.push({ label: SINAIS_LABEL[k] || k, value: triagem[k] });
  });

  if (typeof triagem.intensidade === 'number' && triagem.intensidade > 0) rows.push({ label: 'Intensidade geral', value: `${triagem.intensidade}/10` });
  if (typeof triagem.intensidade_dor === 'number' && triagem.intensidade_dor > 0) rows.push({ label: 'Intensidade da dor', value: `${triagem.intensidade_dor}/10` });

  const boolFields = [
    ['febre', 'Febre'],
    ['dor', 'Dor'],
    ['doenca_cronica', 'Doença crônica'],
    ['gravida_amamentando', 'Grávida/amamentando'],
    ['problema_anterior', 'Problema anterior'],
    ['acompanhamento_medico', 'Acompanhamento médico'],
    ['exercicios', 'Exercícios físicos'],
    ['medicamentos_atuais', 'Medicamentos atuais'],
    ['medicamento_problema', 'Usou medicamento'],
    ['houve_melhora', 'Houve melhora'],
    ['alergia_medicamento', 'Alergia a medicamentos'],
    ['outras_alergias', 'Outras alergias'],
    ['receita_anexo', 'Tem receita'],
  ];
  boolFields.forEach(([k, label]) => {
    if (triagem[k] === true) rows.push({ label, value: 'Sim' });
  });

  const sinais = triagem.sinais_alerta || [];

  return (
    <div>
      <dl style={{ margin: 0 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
            <dt style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, width: 160 }}>{r.label}</dt>
            <dd style={{ fontSize: 13, color: '#111827', margin: 0, flex: 1, wordBreak: 'break-word' }}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {sinais.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', margin: '0 0 4px' }}>Sinais de alerta</p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {sinais.map((s) => <li key={s} style={{ fontSize: 13, color: '#dc2626', marginBottom: 2 }}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

const RADIO_LABELS = {
  problema_autolimitado: { sim: 'Sim', nao: 'Não', indeterminado: 'Indeterminado' },
  paciente_compreendeu:  { sim: 'Sim', parcialmente: 'Parcialmente', nao: 'Não' },
  contraindicacao:       { sim: 'Sim', nao: 'Não', nao_se_aplica: 'Não se aplica' },
  encaminhamento_medico: { sim: 'Sim', nao: 'Não' },
};

const RadioGroup = ({ name, options, value, onChange, error }) => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    {options.map(([val, label]) => (
      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
        <input
          type="radio" name={name} value={val} checked={value === val}
          onChange={() => onChange(val)}
          style={{ accentColor: error && !value ? '#ef4444' : '#2563eb', width: 16, height: 16, cursor: 'pointer' }}
        />
        {label}
      </label>
    ))}
  </div>
);

const FinalizacaoSection = ({
  readonly, data,
  hasError,
  problemaAutolimitado, setProblemaAutolimitado,
  pacienteCompreendeu, setPacienteCompreendeu,
  contraindicacao, setContraindicacao,
  contraindicacaoDetalhe, setContraindicacaoDetalhe,
  encaminhamentoMedico, setEncaminhamentoMedico,
  encaminhamentoDetalhe, setEncaminhamentoDetalhe,
  onChangeAny,
}) => {
  const fldStyle = (val, required = true) => ({
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
    borderLeft: (hasError && required && !val) ? '3px solid #ef4444' : '3px solid transparent',
    paddingLeft: 6,
  });

  if (readonly && data) {
    const lbl = (key, val) => RADIO_LABELS[key]?.[val] ?? val ?? '—';
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: '#f0fdf4', borderBottom: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>📋 Finalização da Consulta</span>
        </div>
        <div style={{ padding: '12px 14px', background: 'white' }}>
          <dl style={{ margin: 0 }}>
            {[
              ['Problema autolimitado', lbl('problema_autolimitado', data.problema_autolimitado)],
              ['Paciente compreendeu as orientações', lbl('paciente_compreendeu', data.paciente_compreendeu)],
              ['Contraindicação ao medicamento', lbl('contraindicacao', data.contraindicacao)],
              ...(data.contraindicacao === 'sim' && data.contraindicacao_detalhe ? [['Qual contraindicação', data.contraindicacao_detalhe]] : []),
              ['Encaminhamento médico', lbl('encaminhamento_medico', data.encaminhamento_medico)],
              ...(data.encaminhamento_medico === 'sim' && data.encaminhamento_detalhe ? [['Especialidade/motivo', data.encaminhamento_detalhe]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                <dt style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0, width: 200 }}>{label}</dt>
                <dd style={{ fontSize: 13, color: '#111827', margin: 0, flex: 1, fontWeight: 500 }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  const q = (label, required) => (
    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
    </span>
  );

  return (
    <div style={{ border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>📋 Finalização da Consulta</span>
        <span style={{ fontSize: 11, color: '#ef4444' }}>* Obrigatório</span>
      </div>
      <div style={{ padding: '4px 14px 8px', background: 'white' }}>

        <div style={{ ...fldStyle(problemaAutolimitado) }}>
          <div style={{ marginBottom: 8 }}>{q('O problema é autolimitado?', true)}</div>
          <RadioGroup name="autolimitado" options={[['sim','Sim'],['nao','Não'],['indeterminado','Indeterminado']]}
            value={problemaAutolimitado} onChange={(v) => { setProblemaAutolimitado(v); onChangeAny?.(); }} error={hasError} />
        </div>

        <div style={{ ...fldStyle(pacienteCompreendeu) }}>
          <div style={{ marginBottom: 8 }}>{q('O paciente compreendeu as orientações?', true)}</div>
          <RadioGroup name="compreendeu" options={[['sim','Sim'],['parcialmente','Parcialmente'],['nao','Não']]}
            value={pacienteCompreendeu} onChange={(v) => { setPacienteCompreendeu(v); onChangeAny?.(); }} error={hasError} />
        </div>

        <div style={{ ...fldStyle(contraindicacao) }}>
          <div style={{ marginBottom: 8 }}>{q('Existe contraindicação ao medicamento?', true)}</div>
          <RadioGroup name="contraindicacao" options={[['sim','Sim'],['nao','Não'],['nao_se_aplica','Não se aplica']]}
            value={contraindicacao} onChange={(v) => { setContraindicacao(v); onChangeAny?.(); }} error={hasError} />
          {contraindicacao === 'sim' && (
            <textarea
              value={contraindicacaoDetalhe}
              onChange={(e) => { setContraindicacaoDetalhe(e.target.value); onChangeAny?.(); }}
              placeholder="Qual contraindicação?"
              rows={2}
              style={{
                marginTop: 10, width: '100%', boxSizing: 'border-box',
                border: `1px solid ${hasError && !contraindicacaoDetalhe.trim() ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
                background: hasError && !contraindicacaoDetalhe.trim() ? '#fef2f2' : 'white',
              }}
            />
          )}
        </div>

        <div style={{ ...fldStyle(encaminhamentoMedico), borderBottom: 'none' }}>
          <div style={{ marginBottom: 8 }}>{q('Necessita encaminhamento médico?', true)}</div>
          <RadioGroup name="encaminhamento" options={[['sim','Sim'],['nao','Não']]}
            value={encaminhamentoMedico} onChange={(v) => { setEncaminhamentoMedico(v); onChangeAny?.(); }}
            error={hasError} />
          {encaminhamentoMedico === 'sim' && (
            <textarea
              value={encaminhamentoDetalhe}
              onChange={(e) => { setEncaminhamentoDetalhe(e.target.value); onChangeAny?.(); }}
              placeholder="Para qual especialidade/motivo?"
              rows={2}
              style={{
                marginTop: 10, width: '100%', boxSizing: 'border-box',
                border: `1px solid ${hasError && !encaminhamentoDetalhe.trim() ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
                background: hasError && !encaminhamentoDetalhe.trim() ? '#fef2f2' : 'white',
              }}
            />
          )}
        </div>

        {hasError && (
          <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 500, marginTop: 4 }}>
            Preencha todos os campos de finalização antes de concluir.
          </p>
        )}
      </div>
    </div>
  );
};

const ConsultaModal = ({ id, tipo, onClose, onUpdated, modo }) => {
  const isVisualizacao = modo === 'visualizacao';
  const { token, user } = useAuth();
  const [consulta, setConsulta]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [motivo, setMotivo]               = useState('');
  const [observacoes, setObservacoes]     = useState('');
  const [obsError, setObsError]           = useState(false);
  const [receita, setReceita]             = useState([]);
  const [receitaPdfUrl, setReceitaPdfUrl] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmCancel, setConfirmCancel]             = useState(false);
  const [motivoCancelamento, setMotivoCancelamento]   = useState('');
  const [showDevolverConfirm, setShowDevolverConfirm] = useState(false);
  const [motivoDevolver, setMotivoDevolver]           = useState('');
  const [rascunhoMsg, setRascunhoMsg]     = useState('');
  const [showHistory, setShowHistory]           = useState(false);
  const [historico, setHistorico]               = useState([]);
  const [loadingHistory, setLoadingHistory]     = useState(false);
  const [selectedHistoricoItem, setSelectedHistoricoItem] = useState(null);
  const [elapsed, setElapsed]             = useState(0);
  const [triagem, setTriagem]             = useState(null);
  const [showTriagem, setShowTriagem]     = useState(false);
  const [finalizacaoData, setFinalizacaoData]             = useState(null);
  const [problemaAutolimitado, setProblemaAutolimitado]   = useState(null);
  const [pacienteCompreendeu, setPacienteCompreendeu]     = useState(null);
  const [contraindicacao, setContraindicacao]             = useState(null);
  const [contraindicacaoDetalhe, setContraindicacaoDetalhe] = useState('');
  const [encaminhamentoMedico, setEncaminhamentoMedico]   = useState(null);
  const [encaminhamentoDetalhe, setEncaminhamentoDetalhe] = useState('');
  const [finalizacaoError, setFinalizacaoError]           = useState(false);
  const timerRef = useRef(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const fetchUrl = isVisualizacao
          ? `${API_URL}/api/consulta/${id}/detalhes?tipo=${tipo}`
          : `${API_URL}/api/consulta/${id}?tipo=${tipo}`;
        const res = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConsulta(data);
          setMotivo(data.motivo || '');
          setObservacoes(data.observacoes || '');
          setReceita(Array.isArray(data.receita) && data.receita.length > 0 ? data.receita : []);
          setReceitaPdfUrl(data.receitaPdfUrl ?? null);
          setTriagem(data.triagem ?? null);
          if (data.finalizacao) {
            const f = data.finalizacao;
            setFinalizacaoData(f);
            setProblemaAutolimitado(f.problema_autolimitado ?? null);
            setPacienteCompreendeu(f.paciente_compreendeu ?? null);
            setContraindicacao(f.contraindicacao ?? null);
            setContraindicacaoDetalhe(f.contraindicacao_detalhe ?? '');
            setEncaminhamentoMedico(f.encaminhamento_medico ?? null);
            setEncaminhamentoDetalhe(f.encaminhamento_detalhe ?? '');
          }
        } else {
          setError('Erro ao carregar consulta.');
        }
      } catch { setError('Falha de conexão.'); }
      setLoading(false);
    };
    load();
  }, [id, tipo, token]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRef.current);
    if (consulta?.status === 'em_atendimento') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [consulta?.status]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Histórico ──────────────────────────────────────────────────────────────
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/historico-completo?tipo=${tipo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistorico(await res.json());
    } catch {}
    setLoadingHistory(false);
  };

  // ── Ações genéricas ────────────────────────────────────────────────────────
  const doAction = async (action, extra = {}) => {
    setError('');
    setActionLoading(action);
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/${action}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tipo, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      setError(data.error || `Erro ao ${action}.`);
      return null;
    } catch { setError('Falha de conexão.'); return null; }
    finally   { setActionLoading(null); }
  };

  const handleIniciar = async () => {
    const data = await doAction('iniciar');
    if (data) {
      setConsulta((p) => ({ ...p, status: 'em_atendimento' }));
      setElapsed(0);
      onUpdated?.();
    }
  };

  const handleConcluir = async () => {
    let hasError = false;
    if (!observacoes.trim()) { setObsError(true); hasError = true; } else { setObsError(false); }

    const finalizacaoOk =
      problemaAutolimitado &&
      pacienteCompreendeu &&
      contraindicacao &&
      encaminhamentoMedico &&
      (contraindicacao !== 'sim' || contraindicacaoDetalhe.trim()) &&
      (encaminhamentoMedico !== 'sim' || encaminhamentoDetalhe.trim());

    if (!finalizacaoOk) { setFinalizacaoError(true); hasError = true; } else { setFinalizacaoError(false); }

    if (hasError) {
      setError('Preencha as observações e todos os campos de finalização antes de concluir.');
      return;
    }

    const itensValidos = receita.filter((m) => m.medicamento?.trim());
    const finalizacao = {
      problema_autolimitado:  problemaAutolimitado,
      paciente_compreendeu:   pacienteCompreendeu,
      contraindicacao,
      contraindicacao_detalhe: contraindicacaoDetalhe.trim() || '',
      encaminhamento_medico:  encaminhamentoMedico,
      encaminhamento_detalhe: encaminhamentoDetalhe.trim() || '',
    };
    const data = await doAction('concluir', {
      observacoes: observacoes.trim(),
      motivo:      motivo.trim() || null,
      receita:     itensValidos,
      finalizacao,
    });
    if (data) {
      setConsulta((p) => ({ ...p, status: 'concluido', receita: itensValidos }));
      setReceita(itensValidos);
      setFinalizacaoData(finalizacao);
      onUpdated?.();
    }
  };

  const handleCancelar = async () => {
    const data = await doAction('cancelar', { motivo_cancelamento: motivoCancelamento.trim() });
    if (data) { onUpdated?.(); onClose(); }
    setConfirmCancel(false);
    setMotivoCancelamento('');
  };

  const handleDevolver = async () => {
    const data = await doAction('devolver', { motivo: motivoDevolver.trim() || null });
    if (data) { onUpdated?.(); onClose(); }
    setShowDevolverConfirm(false);
  };

  const handleSalvarRascunho = async () => {
    const itensValidos = receita.filter((m) => m.medicamento?.trim());
    const data = await doAction('salvar-rascunho', {
      observacoes: observacoes.trim() || null,
      motivo:      motivo.trim() || null,
      receita:     itensValidos,
    });
    if (data) {
      setRascunhoMsg('Rascunho salvo');
      setTimeout(() => setRascunhoMsg(''), 3000);
    }
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const handleGerarPdf = async () => {
    setError('');
    setActionLoading('pdf');
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/receita/pdf`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tipo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setReceitaPdfUrl(data.url);
        window.open(`${API_URL}${data.url}`, '_blank');
      } else {
        setError(data.error || 'Erro ao gerar PDF.');
      }
    } catch { setError('Falha ao gerar PDF.'); }
    finally   { setActionLoading(null); }
  };

  // ── Receita ────────────────────────────────────────────────────────────────
  const addMed    = () => setReceita((p) => [...p, emptyMed()]);
  const removeMed = (i) => setReceita((p) => p.filter((_, idx) => idx !== i));
  const updateMed = (i, field, val) =>
    setReceita((p) => p.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));

  // ── Flags ──────────────────────────────────────────────────────────────────
  const isAssigned       = consulta?.farmaceuticoId === user?.id;
  const canIniciar       = isAssigned && consulta?.status === 'aceito';
  const canConcluir      = isAssigned && consulta?.status === 'em_atendimento';
  const canCancelar      = isAssigned && !['concluido', 'cancelado', 'expirado'].includes(consulta?.status ?? '');
  const canDevolver      = isAssigned && ['aceito', 'em_atendimento'].includes(consulta?.status ?? '');
  const canSalvarRascunho = isAssigned && ['aceito', 'em_atendimento'].includes(consulta?.status ?? '');
  const isActive         = isAssigned && ['aceito', 'em_atendimento'].includes(consulta?.status ?? '');
  const isEncerrada      = ['concluido', 'cancelado'].includes(consulta?.status ?? '');
  const statusCfg        = STATUS_LABELS[consulta?.status] ?? { label: consulta?.status, cls: 'text-gray-500 bg-gray-100' };
  const tipoBadge        = tipo === 'urgente' ? '🔴 Urgente' : '📅 Agendada';
  const podeEditar       = consulta?.status === 'em_atendimento';
  const receitaEditable  = !isVisualizacao && isAssigned && ['aceito', 'em_atendimento'].includes(consulta?.status);
  const receitaReadonly  = isVisualizacao || consulta?.status === 'concluido';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Container: flex col para rodapé fixo */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-2xl shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Atendimento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-xl"
          >
            ×
          </button>
        </div>

        {/* ── Conteúdo rolável ── */}
        {loading ? (
          <div className="flex justify-center py-16 flex-1">
            <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error && !consulta ? (
          <div className="p-6 text-center text-red-600 text-sm flex-1">{error}</div>
        ) : consulta ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pb-4 pt-4 space-y-5">

              {/* Dados do atendimento */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 text-base">{consulta.pacienteNome}</p>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-600 shrink-0">
                    {tipoBadge}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(consulta.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>

                {/* Linha de contato do paciente */}
                {consulta.paciente && (consulta.paciente.telefone || consulta.paciente.email) && (
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#6b7280', paddingTop: '2px' }}>
                    {consulta.paciente.email && (
                      <span>📧 {consulta.paciente.email}</span>
                    )}
                    {consulta.paciente.email && consulta.paciente.telefone && (
                      <span style={{ color: '#d1d5db' }}>|</span>
                    )}
                    {consulta.paciente.telefone && (
                      <>
                        <span>📞 {consulta.paciente.telefone}</span>
                        <a
                          href={`https://wa.me/55${consulta.paciente.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#25D366',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          💬 WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                )}

                {consulta.farmaceuticoNome && (
                  <p className="text-xs text-gray-500">
                    Farmacêutico(a):{' '}
                    <span className="font-semibold text-gray-700">{consulta.farmaceuticoNome}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                  {consulta.status === 'em_atendimento' && !isVisualizacao && (
                    <span className="font-mono text-sm font-bold text-green-700">
                      ⏱ {fmtElapsed(elapsed)}
                    </span>
                  )}
                </div>

                {consulta.status === 'cancelado' && consulta.motivoCancelamento && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1">
                    <p className="text-xs font-semibold text-red-600 mb-0.5">Motivo do cancelamento</p>
                    <p className="text-xs text-red-700 leading-snug">{consulta.motivoCancelamento}</p>
                  </div>
                )}
              </div>

              {/* Botão Devolver (ação secundária, fica inline) */}
              {canDevolver && !showDevolverConfirm && !isVisualizacao && (
                <div className="flex">
                  <button
                    onClick={() => setShowDevolverConfirm(true)}
                    disabled={!!actionLoading}
                    className="px-4 py-2 bg-white border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-50 disabled:opacity-50 transition"
                  >
                    ↩ Devolver para fila
                  </button>
                </div>
              )}

              {/* Confirmação de devolução */}
              {showDevolverConfirm && !isVisualizacao && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-amber-800">Devolver esta consulta para a fila?</p>
                  <p className="text-xs text-amber-600">Outro farmacêutico poderá atendê-la.</p>
                  <textarea
                    value={motivoDevolver}
                    onChange={(e) => setMotivoDevolver(e.target.value)}
                    placeholder="Motivo da devolução (opcional)"
                    rows={2}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDevolverConfirm(false); setMotivoDevolver(''); }}
                      className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleDevolver}
                      disabled={actionLoading === 'devolver'}
                      className="flex-1 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
                    >
                      {actionLoading === 'devolver' ? '...' : 'Sim, devolver'}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              {/* Triagem do paciente */}
              {triagem && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setShowTriagem((p) => !p)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: '#f9fafb', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, color: '#374151',
                    }}
                  >
                    <span>Triagem do paciente</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{showTriagem ? '▲ Fechar' : '▼ Ver'}</span>
                  </button>
                  {showTriagem && (
                    <div style={{ padding: '12px 14px', background: 'white', fontSize: 13, color: '#374151' }}>
                      <TriagemDisplay triagem={triagem} solicitanteNome={consulta?.pacienteNome} />
                    </div>
                  )}
                </div>
              )}

              {/* Motivo e Observações */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Motivo / Queixa principal
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    readOnly={isEncerrada || isVisualizacao || !podeEditar}
                    title={!podeEditar && !isEncerrada && !isVisualizacao ? 'Inicie o atendimento para editar' : undefined}
                    placeholder="Descreva o motivo da consulta ou queixa do paciente..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-violet-400 outline-none"
                    style={{ background: (!podeEditar && !isEncerrada && !isVisualizacao) ? '#f3f4f6' : undefined }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Observações do atendimento{canConcluir && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => { setObservacoes(e.target.value); if (obsError) setObsError(false); }}
                    readOnly={isEncerrada || isVisualizacao || !podeEditar}
                    title={!podeEditar && !isEncerrada && !isVisualizacao ? 'Inicie o atendimento para editar' : undefined}
                    placeholder="Orientações, recomendações ou observações clínicas..."
                    rows={4}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 outline-none transition ${
                      obsError
                        ? 'border-red-400 focus:ring-red-300 bg-red-50'
                        : 'border-gray-200 focus:ring-violet-400'
                    }`}
                    style={{ background: (!podeEditar && !isEncerrada && !isVisualizacao && !obsError) ? '#f3f4f6' : undefined }}
                  />
                  {obsError && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Preencha as observações antes de concluir.
                    </p>
                  )}
                </div>
              </div>

              {/* Finalização da Consulta */}
              {(canConcluir || finalizacaoData) && (
                <FinalizacaoSection
                  readonly={!canConcluir}
                  data={finalizacaoData}
                  hasError={finalizacaoError}
                  problemaAutolimitado={problemaAutolimitado} setProblemaAutolimitado={setProblemaAutolimitado}
                  pacienteCompreendeu={pacienteCompreendeu} setPacienteCompreendeu={setPacienteCompreendeu}
                  contraindicacao={contraindicacao} setContraindicacao={setContraindicacao}
                  contraindicacaoDetalhe={contraindicacaoDetalhe} setContraindicacaoDetalhe={setContraindicacaoDetalhe}
                  encaminhamentoMedico={encaminhamentoMedico} setEncaminhamentoMedico={setEncaminhamentoMedico}
                  encaminhamentoDetalhe={encaminhamentoDetalhe} setEncaminhamentoDetalhe={setEncaminhamentoDetalhe}
                  onChangeAny={() => setFinalizacaoError(false)}
                />
              )}

              {/* Receita Farmacêutica */}
              {(receitaEditable || receitaReadonly) && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">💊 Receita Farmacêutica</h3>

                  {receitaEditable ? (
                    <div className="space-y-2">
                      {receita.map((med, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">Medicamento {i + 1}</span>
                            <button
                              onClick={() => removeMed(i)}
                              className="text-red-400 hover:text-red-600 text-lg leading-none w-6 h-6 flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Nome do medicamento"
                            value={med.medicamento}
                            onChange={(e) => updateMed(i, 'medicamento', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Dosagem (ex: 500mg)"
                              value={med.dosagem}
                              onChange={(e) => updateMed(i, 'dosagem', e.target.value)}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Duração (ex: 7 dias)"
                              value={med.duracao}
                              onChange={(e) => updateMed(i, 'duracao', e.target.value)}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Posologia (ex: 1 comprimido de 8 em 8 horas)"
                            value={med.posologia}
                            onChange={(e) => updateMed(i, 'posologia', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                          />
                        </div>
                      ))}
                      <button
                        onClick={addMed}
                        disabled={!podeEditar}
                        title={!podeEditar ? 'Inicie o atendimento para editar' : undefined}
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: podeEditar ? '#7c3aed' : '#9ca3af',
                          border: `2px dashed ${podeEditar ? '#ddd6fe' : '#e5e7eb'}`,
                          borderRadius: '12px',
                          background: 'white',
                          cursor: podeEditar ? 'pointer' : 'not-allowed',
                          opacity: podeEditar ? 1 : 0.5,
                        }}
                      >
                        + Adicionar medicamento
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {receita.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Nenhum medicamento prescrito.</p>
                      ) : (
                        <div className="space-y-2">
                          {receita.map((med, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-3 text-xs space-y-0.5">
                              <p className="font-semibold text-gray-800 text-sm">
                                {i + 1}. {med.medicamento}{med.dosagem ? `  ${med.dosagem}` : ''}
                              </p>
                              {med.posologia && <p className="text-gray-600">Posologia: {med.posologia}</p>}
                              {med.duracao   && <p className="text-gray-600">Duração: {med.duracao}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      {(isAssigned || (isVisualizacao && receitaPdfUrl)) && (
                        <div className="flex gap-2 pt-1">
                          {receitaPdfUrl && (
                            <a
                              href={`${API_URL}${receitaPdfUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 px-4 py-2.5 text-center text-sm font-bold text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-50 transition"
                            >
                              📄 Ver PDF
                            </a>
                          )}
                          {isAssigned && !isVisualizacao && (
                            <button
                              onClick={handleGerarPdf}
                              disabled={actionLoading === 'pdf'}
                              className="flex-1 px-4 py-2.5 text-sm font-bold bg-violet-700 text-white rounded-xl hover:bg-violet-800 disabled:opacity-50 transition"
                            >
                              {actionLoading === 'pdf'
                                ? '⏳ Gerando...'
                                : receitaPdfUrl ? '↺ Re-gerar PDF' : '📄 Gerar PDF'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Histórico do paciente */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                    const next = !showHistory;
                    setShowHistory(next);
                    if (next && historico.length === 0) loadHistory();
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-violet-700 transition w-full text-left"
                >
                  <span className="text-xs">{showHistory ? '▲' : '▼'}</span>
                  Histórico do paciente
                  {historico.length > 0 && (
                    <span className="text-xs text-gray-400 font-normal ml-1">({historico.length} registros)</span>
                  )}
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
                    {loadingHistory ? (
                      <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : historico.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">Nenhum histórico encontrado.</p>
                    ) : (
                      historico.map((h) => {
                        const isCanceled = String(h.status).toLowerCase().includes('cancel');
                        return (
                          <div key={h.id} className="bg-gray-50 rounded-xl p-3 text-xs space-y-2">
                            {/* Linha 1: badges + data */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                h.tipo === 'urgente'  ? 'bg-red-100 text-red-700' :
                                h.tipo === 'agendada' ? 'bg-violet-100 text-violet-700' :
                                                        'bg-gray-200 text-gray-600'
                              }`}>
                                {h.tipo === 'urgente' ? 'Urgente' : h.tipo === 'agendada' ? 'Agendada' : 'Consulta'}
                              </span>
                              <span className="text-gray-400">
                                {new Date(h.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                              </span>
                              <span className={`font-medium ${isCanceled ? 'text-red-500' : 'text-green-600'}`}>
                                {isCanceled ? 'Cancelado' : 'Concluído'}
                              </span>
                            </div>

                            {/* Farmacêutico */}
                            {h.farmaceuticoNome && (
                              <p className="text-gray-500">
                                Farmacêutico(a): <span className="font-semibold text-gray-700">{h.farmaceuticoNome}</span>
                              </p>
                            )}

                            {/* Trecho das observações */}
                            {h.observacoes && (
                              <p className="text-gray-600 italic leading-snug">
                                "{truncate(h.observacoes, 80)}"
                              </p>
                            )}
                            {!h.observacoes && !h.motivo && (
                              <p className="text-gray-400 italic">Sem registros clínicos.</p>
                            )}

                            {/* Botão ver completo */}
                            <button
                              onClick={() => setSelectedHistoricoItem(h)}
                              style={{
                                width: '100%',
                                background: 'white',
                                color: '#7c3aed',
                                border: '1px solid #ddd6fe',
                                borderRadius: '8px',
                                padding: '6px 0',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Ver atendimento completo →
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : null}

        {/* ── Rodapé fixo ── */}
        {consulta && !loading && (
          <div className="shrink-0 border-t border-gray-100 bg-white rounded-b-2xl">

            {/* Confirmação de cancelamento no rodapé */}
            {isVisualizacao ? (
              <div className="px-6 py-4">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-700"
                >
                  Fechar
                </button>
              </div>

            ) : confirmCancel ? (
              <div className="px-6 py-4 bg-red-50 rounded-b-2xl space-y-3">
                <p className="text-sm font-semibold text-red-800">Cancelar esta consulta?</p>
                <p className="text-xs text-red-600">
                  O crédito de R$ {Number(consulta.creditoDebitado || 50).toFixed(2).replace('.', ',')} será devolvido ao paciente.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-red-700 mb-1">
                    Motivo do cancelamento <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivoCancelamento}
                    onChange={(e) => setMotivoCancelamento(e.target.value)}
                    placeholder="Descreva o motivo do cancelamento..."
                    rows={3}
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-red-300 outline-none bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setConfirmCancel(false); setMotivoCancelamento(''); }}
                    className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-white transition bg-white"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCancelar}
                    disabled={actionLoading === 'cancelar' || !motivoCancelamento.trim()}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      fontSize: '14px',
                      fontWeight: '700',
                      background: motivoCancelamento.trim() ? '#dc2626' : '#f3f4f6',
                      color: motivoCancelamento.trim() ? 'white' : '#9ca3af',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (actionLoading === 'cancelar' || !motivoCancelamento.trim()) ? 'not-allowed' : 'pointer',
                      opacity: actionLoading === 'cancelar' ? 0.5 : 1,
                      transition: 'background 0.15s',
                    }}
                  >
                    {actionLoading === 'cancelar' ? '...' : 'Sim, cancelar'}
                  </button>
                </div>
              </div>

            ) : isActive ? (
              /* Botões de ação principais */
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                gap: '8px',
              }}>
                {/* Esquerda: Cancelar */}
                <div>
                  {canCancelar && (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      disabled={!!actionLoading}
                      style={{
                        background: 'white',
                        color: '#dc2626',
                        border: '1.5px solid #fca5a5',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        opacity: actionLoading ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ❌ Cancelar consulta
                    </button>
                  )}
                </div>

                {/* Direita: Salvar rascunho + Iniciar/Concluir */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {rascunhoMsg && (
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      ✓ {rascunhoMsg}
                    </span>
                  )}
                  {canSalvarRascunho && (
                    <button
                      onClick={handleSalvarRascunho}
                      disabled={!!actionLoading || !podeEditar}
                      title={!podeEditar ? 'Inicie o atendimento para salvar' : undefined}
                      style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: (actionLoading || !podeEditar) ? 'not-allowed' : 'pointer',
                        opacity: (actionLoading || !podeEditar) ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {actionLoading === 'salvar-rascunho' ? '...' : '💾 Salvar rascunho'}
                    </button>
                  )}
                  {canIniciar && (
                    <button
                      onClick={handleIniciar}
                      disabled={!!actionLoading}
                      style={{
                        background: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        padding: '9px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        opacity: actionLoading ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {actionLoading === 'iniciar' ? '...' : '▶ Iniciar atendimento'}
                    </button>
                  )}
                  {canConcluir && (
                    <button
                      onClick={handleConcluir}
                      disabled={!!actionLoading}
                      style={{
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        padding: '9px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        opacity: actionLoading ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {actionLoading === 'concluir' ? '...' : '✅ Concluir atendimento'}
                    </button>
                  )}
                </div>
              </div>

            ) : isEncerrada ? (
              /* Banner de consulta encerrada */
              <div className="px-6 py-4">
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-sm font-medium text-gray-500">
                    {consulta.status === 'concluido'
                      ? '✅ Consulta encerrada — somente leitura'
                      : '❌ Consulta cancelada — somente leitura'}
                  </p>
                </div>
              </div>
            ) : null}

          </div>
        )}

      </div>

      {/* Modal detalhe de atendimento anterior */}
      {selectedHistoricoItem && (
        <HistoricoDetalheModal
          item={selectedHistoricoItem}
          onClose={() => setSelectedHistoricoItem(null)}
        />
      )}
    </div>
  );
};

export default ConsultaModal;
