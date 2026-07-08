import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { abrirDocumentoAutenticado } from '../utils/abrirDocumentoAutenticado';
import { STATUS_LABELS, emptyMed } from '../utils/consultaFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useConsultaModal({ id, tipo, onClose, onUpdated, modo }) {
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
  const [encaminhamentoPdfUrl, setEncaminhamentoPdfUrl] = useState(null);
  const [showEncaminhForm, setShowEncaminhForm]         = useState(false);
  const [encaminhEspecialidade, setEncaminhEspecialidade] = useState('');
  const [encaminhResumo, setEncaminhResumo]               = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmCancel, setConfirmCancel]             = useState(false);
  const [motivoCancelamento, setMotivoCancelamento]   = useState('');
  const [showDevolverConfirm, setShowDevolverConfirm] = useState(false);
  const [motivoDevolver, setMotivoDevolver]           = useState('');
  const [rascunhoMsg, setRascunhoMsg]     = useState('');
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
  const [showSemContatoConfirm, setShowSemContatoConfirm] = useState(false);
  const [semContatoLoading, setSemContatoLoading]         = useState(false);
  const [retornoDias, setRetornoDias]   = useState('');
  const [retornoObs, setRetornoObs]     = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
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
          setEncaminhamentoPdfUrl(data.encaminhamentoPdfUrl ?? null);
          if (data.finalizacao?.encaminhamento_detalhe) setEncaminhResumo(data.finalizacao.encaminhamento_detalhe);
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
    const retornoSugeridoPayload = retornoDias
      ? { dias_sugeridos: parseInt(retornoDias, 10), observacao: retornoObs.trim() || null }
      : null;
    const data = await doAction('concluir', {
      observacoes: observacoes.trim(),
      motivo:      motivo.trim() || null,
      receita:     itensValidos,
      finalizacao,
      retorno_sugerido: retornoSugeridoPayload,
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

  const handleSemContato = async () => {
    setSemContatoLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/sem-contato`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tipo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowSemContatoConfirm(false);
        onUpdated?.();
        onClose();
      } else {
        setError(data.error || 'Erro ao registrar sem contato.');
        setShowSemContatoConfirm(false);
      }
    } catch { setError('Falha de conexão.'); setShowSemContatoConfirm(false); }
    finally   { setSemContatoLoading(false); }
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
  const handleAbrirDocumento = async (pdfUrl) => {
    try {
      await abrirDocumentoAutenticado(`${API_URL}${pdfUrl}`, token);
    } catch {
      setError('Não foi possível abrir o documento.');
    }
  };

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

  // ── Encaminhamento PDF ─────────────────────────────────────────────────────
  const handleGerarEncaminhamento = async () => {
    if (!encaminhEspecialidade.trim()) {
      setError('Informe a especialidade / serviço de destino.');
      return;
    }
    setError('');
    setActionLoading('encaminh');
    try {
      const res = await fetch(`${API_URL}/api/consulta/${id}/encaminhamento/pdf`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tipo, especialidade: encaminhEspecialidade, resumoClinico: encaminhResumo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setEncaminhamentoPdfUrl(data.url);
        setShowEncaminhForm(false);
        window.open(`${API_URL}${data.url}`, '_blank');
      } else {
        setError(data.error || 'Erro ao gerar encaminhamento.');
      }
    } catch { setError('Falha ao gerar encaminhamento.'); }
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

  return {
    isVisualizacao,
    consulta, loading, error,
    motivo, setMotivo, observacoes, setObservacoes, obsError, setObsError,
    receita, receitaPdfUrl, encaminhamentoPdfUrl,
    showEncaminhForm, setShowEncaminhForm,
    encaminhEspecialidade, setEncaminhEspecialidade,
    encaminhResumo, setEncaminhResumo,
    actionLoading,
    confirmCancel, setConfirmCancel,
    motivoCancelamento, setMotivoCancelamento,
    showDevolverConfirm, setShowDevolverConfirm,
    motivoDevolver, setMotivoDevolver,
    rascunhoMsg,
    elapsed,
    triagem, showTriagem, setShowTriagem,
    finalizacaoData,
    problemaAutolimitado, setProblemaAutolimitado,
    pacienteCompreendeu, setPacienteCompreendeu,
    contraindicacao, setContraindicacao,
    contraindicacaoDetalhe, setContraindicacaoDetalhe,
    encaminhamentoMedico, setEncaminhamentoMedico,
    encaminhamentoDetalhe, setEncaminhamentoDetalhe,
    finalizacaoError, setFinalizacaoError,
    showSemContatoConfirm, setShowSemContatoConfirm,
    semContatoLoading,
    retornoDias, setRetornoDias, retornoObs, setRetornoObs,
    showTemplatePicker, setShowTemplatePicker,
    handleIniciar, handleConcluir, handleCancelar, handleDevolver, handleSemContato,
    handleSalvarRascunho, handleAbrirDocumento, handleGerarPdf, handleGerarEncaminhamento,
    addMed, removeMed, updateMed,
    isAssigned, canIniciar, canConcluir, canCancelar, canDevolver, canSalvarRascunho,
    isActive, isEncerrada, statusCfg, tipoBadge, podeEditar, receitaEditable, receitaReadonly,
  };
}
