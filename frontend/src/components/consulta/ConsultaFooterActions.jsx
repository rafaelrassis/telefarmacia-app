import React from 'react';
import { X, Save, Play, Check, CheckCircle2, XCircle } from 'lucide-react';

const ConsultaFooterActions = ({
  isVisualizacao, onClose,
  confirmCancel, setConfirmCancel,
  motivoCancelamento, setMotivoCancelamento,
  actionLoading, handleCancelar,
  consulta, isActive, canCancelar, canSalvarRascunho, canIniciar, canConcluir,
  rascunhoMsg, handleSalvarRascunho, handleIniciar, handleConcluir,
  isEncerrada, podeEditar,
}) => (
  <div className="shrink-0 border-t border-line bg-canvas rounded-b-2xl">

    {/* Confirmação de cancelamento no rodapé */}
    {isVisualizacao ? (
      <div className="px-6 py-4">
        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-semibold border border-line rounded-xl hover:bg-surface transition text-ink"
        >
          Fechar
        </button>
      </div>

    ) : confirmCancel ? (
      <div className="px-6 py-4 bg-error-wash rounded-b-2xl space-y-3">
        <p className="text-sm font-semibold text-error">Cancelar esta consulta?</p>
        <p className="text-xs text-error">
          O crédito de R$ {Number(consulta.creditoDebitado || 50).toFixed(2).replace('.', ',')} será devolvido ao paciente.
        </p>
        <div>
          <label className="block text-xs font-semibold text-error mb-1">
            Motivo do cancelamento <span className="text-error">*</span>
          </label>
          <textarea
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Descreva o motivo do cancelamento..."
            rows={3}
            className="w-full border border-error/30 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-error/30 outline-none bg-canvas"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setConfirmCancel(false); setMotivoCancelamento(''); }}
            className="flex-1 py-2 text-sm border border-line rounded-lg hover:bg-canvas transition bg-canvas"
          >
            Voltar
          </button>
          <button
            onClick={handleCancelar}
            disabled={actionLoading === 'cancelar' || !motivoCancelamento.trim()}
            className={`flex-1 py-2 text-sm font-bold rounded-lg border-0 transition-colors ${
              motivoCancelamento.trim() ? 'bg-error text-error-contrast' : 'bg-surface text-muted'
            } ${(actionLoading === 'cancelar' || !motivoCancelamento.trim()) ? 'cursor-not-allowed' : 'cursor-pointer'} ${
              actionLoading === 'cancelar' ? 'opacity-50' : ''
            }`}
          >
            {actionLoading === 'cancelar' ? '...' : 'Sim, cancelar'}
          </button>
        </div>
      </div>

    ) : isActive ? (
      /* Botões de ação principais */
      <div className="flex justify-between items-center p-4 gap-2">
        {/* Esquerda: Cancelar */}
        <div>
          {canCancelar && (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={!!actionLoading}
              className={`bg-canvas text-error border-[1.5px] border-error/40 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${
                actionLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <X className="w-4 h-4" />
              Cancelar consulta
            </button>
          )}
        </div>

        {/* Direita: Salvar rascunho + Iniciar/Concluir */}
        <div className="flex gap-2 items-center">
          {rascunhoMsg && (
            <span className="text-xs font-semibold text-success whitespace-nowrap inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {rascunhoMsg}
            </span>
          )}
          {canSalvarRascunho && (
            <button
              onClick={handleSalvarRascunho}
              disabled={!!actionLoading || !podeEditar}
              title={!podeEditar ? 'Inicie o atendimento para salvar' : undefined}
              className={`bg-surface text-ink border border-line px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${
                (actionLoading || !podeEditar) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              {actionLoading === 'salvar-rascunho' ? '...' : (<><Save className="w-4 h-4" />Salvar rascunho</>)}
            </button>
          )}
          {canIniciar && (
            <button
              onClick={handleIniciar}
              disabled={!!actionLoading}
              className={`bg-brand text-brand-contrast border-0 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                actionLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              {actionLoading === 'iniciar' ? '...' : (<><Play className="w-4 h-4" />Iniciar atendimento</>)}
            </button>
          )}
          {canConcluir && (
            <button
              onClick={handleConcluir}
              disabled={!!actionLoading}
              className={`bg-success text-success-contrast border-0 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                actionLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              {actionLoading === 'concluir' ? '...' : (<><CheckCircle2 className="w-4 h-4" />Concluir atendimento</>)}
            </button>
          )}
        </div>
      </div>

    ) : isEncerrada ? (
      /* Banner de consulta encerrada */
      <div className="px-6 py-4">
        <div className="bg-surface border border-line rounded-xl px-4 py-3 text-center">
          <p className="text-sm font-medium text-muted inline-flex items-center justify-center gap-1.5">
            {consulta.status === 'concluido' ? (
              <><CheckCircle2 className="w-4 h-4 text-success" />Consulta encerrada — somente leitura</>
            ) : (
              <><XCircle className="w-4 h-4 text-error" />Consulta cancelada — somente leitura</>
            )}
          </p>
        </div>
      </div>
    ) : null}

  </div>
);

export default ConsultaFooterActions;
