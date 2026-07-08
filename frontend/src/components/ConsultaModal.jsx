import React from 'react';
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
  } = useConsultaModal({ id, tipo, onClose, onUpdated, modo });

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

              <ConsultaInfoHeader
                consulta={consulta} tipoBadge={tipoBadge} statusCfg={statusCfg}
                elapsed={elapsed} isVisualizacao={isVisualizacao} isActive={isActive}
              />

              <DevolverAction
                canDevolver={canDevolver} isVisualizacao={isVisualizacao} actionLoading={actionLoading}
                showDevolverConfirm={showDevolverConfirm} setShowDevolverConfirm={setShowDevolverConfirm}
                motivoDevolver={motivoDevolver} setMotivoDevolver={setMotivoDevolver}
                handleDevolver={handleDevolver}
              />

              <SemContatoAction
                isActive={isActive} isVisualizacao={isVisualizacao} actionLoading={actionLoading}
                showDevolverConfirm={showDevolverConfirm}
                showSemContatoConfirm={showSemContatoConfirm} setShowSemContatoConfirm={setShowSemContatoConfirm}
                semContatoLoading={semContatoLoading} handleSemContato={handleSemContato}
              />

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

              <TriagemCollapsible
                triagem={triagem} pacienteNome={consulta?.pacienteNome}
                showTriagem={showTriagem} setShowTriagem={setShowTriagem}
              />

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
                showTemplatePicker={showTemplatePicker} setShowTemplatePicker={setShowTemplatePicker}
                consulta={consulta} triagem={triagem} setObservacoes={setObservacoes}
              />

              <EncaminhamentoSection
                consulta={consulta} isAssigned={isAssigned} isVisualizacao={isVisualizacao}
                encaminhamentoPdfUrl={encaminhamentoPdfUrl} handleAbrirDocumento={handleAbrirDocumento}
                showEncaminhForm={showEncaminhForm} setShowEncaminhForm={setShowEncaminhForm}
                encaminhEspecialidade={encaminhEspecialidade} setEncaminhEspecialidade={setEncaminhEspecialidade}
                encaminhResumo={encaminhResumo} setEncaminhResumo={setEncaminhResumo}
                handleGerarEncaminhamento={handleGerarEncaminhamento} actionLoading={actionLoading}
              />

              <HistoricoSection id={id} tipo={tipo} />

            </div>
          </div>
        ) : null}

        {/* ── Rodapé fixo ── */}
        {consulta && !loading && (
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
        )}

      </div>
    </div>
  );
};

export default ConsultaModal;
