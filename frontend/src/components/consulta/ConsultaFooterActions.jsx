import React from 'react';

const ConsultaFooterActions = ({
  isVisualizacao, onClose,
  confirmCancel, setConfirmCancel,
  motivoCancelamento, setMotivoCancelamento,
  actionLoading, handleCancelar,
  consulta, isActive, canCancelar, canSalvarRascunho, canIniciar, canConcluir,
  rascunhoMsg, handleSalvarRascunho, handleIniciar, handleConcluir,
  isEncerrada, podeEditar,
}) => (
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
);

export default ConsultaFooterActions;
