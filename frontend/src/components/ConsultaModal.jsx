import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useConsultaModal } from '../hooks/useConsultaModal';
import FinalizacaoSection from './consulta/FinalizacaoSection';
import ConsultaInfoHeader from './consulta/ConsultaInfoHeader';
import DevolverAction from './consulta/DevolverAction';
import SemContatoAction from './consulta/SemContatoAction';
import TriagemCollapsible from './consulta/TriagemCollapsible';
import MotivoObservacoesForm from './consulta/MotivoObservacoesForm';
import RetornoSugeridoForm from './consulta/RetornoSugeridoForm';
import ReceitaSection from './consulta/ReceitaSection';
import EncaminhamentoSection from './consulta/EncaminhamentoSection';
import HistoricoSection from './consulta/HistoricoSection';
import ConsultaFooterActions from './consulta/ConsultaFooterActions';

const ConsultaModal = ({ id, tipo, onClose, onUpdated, modo }) => {
  const {
    isVisualizacao,
    consulta, loading, error,
    motivo, setMotivo, observacoes, setObservacoes, obsError, setObsError,
    receita, receitaPdfUrl, encaminhamentoPdfUrl, anexoReceitaUrl,
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
    isActive, isEncerrada, statusCfg, podeEditar, receitaEditable, receitaReadonly,
  } = useConsultaModal({ id, tipo, onClose, onUpdated, modo });

  // Triagem aberta por padrão ao carregar (Fase 10B.1) — usa o setter já
  // existente no hook, sem novo estado ou lógica de negócio.
  useEffect(() => {
    if (consulta && !showTriagem) setShowTriagem(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Painel de trabalho — quase tela cheia, 3 zonas: header/corpo/footer fixos */}
      <div className="relative bg-canvas rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-[95vh] flex flex-col overflow-hidden">

        {/* ── Header fixo ── */}
        <div className="shrink-0 border-b border-line bg-canvas">
          {loading ? (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="h-5 w-40 bg-surface rounded animate-pulse" />
              <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface transition"><X className="w-5 h-5" /></button>
            </div>
          ) : consulta ? (
            <ConsultaInfoHeader
              consulta={consulta} tipo={tipo} triagem={triagem} statusCfg={statusCfg}
              elapsed={elapsed} isVisualizacao={isVisualizacao} isActive={isActive}
              onClose={onClose}
            />
          ) : (
            <div className="px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-ink text-lg">Atendimento</h2>
              <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-ink w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface transition"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {/* ── Corpo: leitura à esquerda, produção à direita (desktop); coluna única no mobile ── */}
        {loading ? (
          <div className="flex justify-center py-16 flex-1">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error && !consulta ? (
          <div className="p-6 text-center text-error text-sm flex-1">{error}</div>
        ) : consulta ? (
          <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:flex lg:min-h-0">

            {/* ESQUERDA — leitura: triagem + histórico */}
            <div className="lg:w-[40%] lg:shrink-0 lg:overflow-y-auto lg:border-r border-line px-4 sm:px-6 py-4 space-y-4">
              <TriagemCollapsible
                triagem={triagem} pacienteNome={consulta?.pacienteNome}
                showTriagem={showTriagem} setShowTriagem={setShowTriagem}
                anexoReceitaUrl={anexoReceitaUrl} onAbrirAnexo={handleAbrirDocumento}
              />
              <HistoricoSection id={id} tipo={tipo} />
            </div>

            {/* DIREITA — produção: motivo/observações, finalização, receita, encaminhamento */}
            <div className="lg:flex-1 lg:overflow-y-auto px-4 sm:px-6 py-4 space-y-5">

              {error && <p className="text-sm text-error font-medium">{error}</p>}

              <MotivoObservacoesForm
                motivo={motivo} setMotivo={setMotivo}
                observacoes={observacoes} setObservacoes={setObservacoes}
                obsError={obsError} setObsError={setObsError}
                isEncerrada={isEncerrada} isVisualizacao={isVisualizacao}
                podeEditar={podeEditar} canConcluir={canConcluir}
                consulta={consulta} triagem={triagem}
                showTemplatePicker={showTemplatePicker} setShowTemplatePicker={setShowTemplatePicker}
              />

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

              {canConcluir && (
                <RetornoSugeridoForm
                  retornoDias={retornoDias} setRetornoDias={setRetornoDias}
                  retornoObs={retornoObs} setRetornoObs={setRetornoObs}
                />
              )}

              <ReceitaSection
                receitaEditable={receitaEditable} receitaReadonly={receitaReadonly}
                receita={receita} addMed={addMed} removeMed={removeMed} updateMed={updateMed}
                podeEditar={podeEditar} isAssigned={isAssigned} isVisualizacao={isVisualizacao}
                receitaPdfUrl={receitaPdfUrl} handleAbrirDocumento={handleAbrirDocumento}
                handleGerarPdf={handleGerarPdf} actionLoading={actionLoading}
              />

              <EncaminhamentoSection
                consulta={consulta} isAssigned={isAssigned} isVisualizacao={isVisualizacao}
                encaminhamentoPdfUrl={encaminhamentoPdfUrl} handleAbrirDocumento={handleAbrirDocumento}
                showEncaminhForm={showEncaminhForm} setShowEncaminhForm={setShowEncaminhForm}
                encaminhEspecialidade={encaminhEspecialidade} setEncaminhEspecialidade={setEncaminhEspecialidade}
                encaminhResumo={encaminhResumo} setEncaminhResumo={setEncaminhResumo}
                handleGerarEncaminhamento={handleGerarEncaminhamento} actionLoading={actionLoading}
              />
            </div>
          </div>
        ) : null}

        {/* ── Footer fixo: ações de ciclo de vida sempre visíveis ── */}
        {consulta && !loading && (
          <div className="shrink-0 border-t border-line bg-canvas">
            {!isVisualizacao && (canDevolver || showDevolverConfirm) && !confirmCancel && (
              <div className="px-4 sm:px-6 pt-3">
                <DevolverAction
                  canDevolver={canDevolver} isVisualizacao={isVisualizacao} actionLoading={actionLoading}
                  showDevolverConfirm={showDevolverConfirm} setShowDevolverConfirm={setShowDevolverConfirm}
                  motivoDevolver={motivoDevolver} setMotivoDevolver={setMotivoDevolver}
                  handleDevolver={handleDevolver}
                />
              </div>
            )}

            {!isVisualizacao && isActive && !showDevolverConfirm && !confirmCancel && (
              <div className="px-4 sm:px-6 pt-3">
                <SemContatoAction
                  isActive={isActive} isVisualizacao={isVisualizacao} actionLoading={actionLoading}
                  showDevolverConfirm={showDevolverConfirm}
                  showSemContatoConfirm={showSemContatoConfirm} setShowSemContatoConfirm={setShowSemContatoConfirm}
                  semContatoLoading={semContatoLoading} handleSemContato={handleSemContato}
                />
              </div>
            )}

            <ConsultaFooterActions
              isVisualizacao={isVisualizacao} onClose={onClose}
              confirmCancel={confirmCancel} setConfirmCancel={setConfirmCancel}
              motivoCancelamento={motivoCancelamento} setMotivoCancelamento={setMotivoCancelamento}
              actionLoading={actionLoading} handleCancelar={handleCancelar}
              consulta={consulta} isActive={isActive} canCancelar={canCancelar}
              canSalvarRascunho={canSalvarRascunho} canIniciar={canIniciar} canConcluir={canConcluir}
              rascunhoMsg={rascunhoMsg} handleSalvarRascunho={handleSalvarRascunho}
              handleIniciar={handleIniciar} handleConcluir={handleConcluir}
              isEncerrada={isEncerrada} podeEditar={podeEditar}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ConsultaModal;
