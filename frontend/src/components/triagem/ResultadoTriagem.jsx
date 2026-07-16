import React from 'react';
import { Check, AlertTriangle, Loader2 } from 'lucide-react';

export const ResultadoLoading = () => (
  <div className="text-center py-10 px-6">
    <Loader2 className="w-9 h-9 text-brand animate-spin mx-auto mb-4" />
    <p className="text-sm font-medium text-ink m-0">Realizando agendamento...</p>
  </div>
);

export const ResultadoSucesso = ({ agResult, onFechar }) => (
  <div className="text-center py-8 px-6">
    <div className="w-14 h-14 bg-success-wash rounded-full flex items-center justify-center mx-auto mb-4">
      <Check className="w-7 h-7 text-success" strokeWidth={2.5} />
    </div>
    <h2 className="font-heading font-bold text-ink text-lg mb-2">Consulta agendada!</h2>
    <p className="text-sm text-muted mb-4">
      Você será chamado(a) pelo WhatsApp informado no horário marcado.
    </p>
    {agResult && (
      <div className="bg-surface rounded-xl p-4 mb-4 text-left">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Data e hora</span>
          <span className="font-semibold text-ink">
            {new Date(agResult.data_hora).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {agResult.preco_cobrado && (
          <div className="flex justify-between text-sm">
            <span className="text-muted">Valor debitado</span>
            <span className="font-semibold text-ink">R$ {Number(agResult.preco_cobrado).toFixed(2).replace('.', ',')}</span>
          </div>
        )}
      </div>
    )}
    <button onClick={onFechar} className="w-full py-2.5 text-sm font-bold bg-brand text-brand-contrast rounded-xl">
      Fechar
    </button>
  </div>
);

export const ResultadoErro = ({ agInsuficiente, agErrorMsg, onAddCredits, onTentarNovamente }) => (
  <div className="text-center py-8 px-6">
    <div className="w-14 h-14 bg-error-wash rounded-full flex items-center justify-center mx-auto mb-4">
      <AlertTriangle className="w-7 h-7 text-error" strokeWidth={2} />
    </div>
    <h2 className="font-bold text-ink mb-2">{agInsuficiente ? 'Saldo insuficiente' : 'Erro no agendamento'}</h2>
    <p className="text-sm text-muted mb-5">{agErrorMsg}</p>
    <div className="flex gap-3">
      {agInsuficiente && (
        <button onClick={onAddCredits} className="flex-1 py-2.5 text-sm font-bold bg-brand text-brand-contrast rounded-xl">
          Adicionar créditos
        </button>
      )}
      <button onClick={onTentarNovamente} className="flex-1 py-2.5 text-sm font-medium border border-line rounded-xl bg-canvas text-ink">
        Tentar novamente
      </button>
    </div>
  </div>
);
