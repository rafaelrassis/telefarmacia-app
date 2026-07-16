import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { inp, lbl } from './shared';

const SelecaoDataHorario = ({
  onBack, sistemaInfo, selectedDate, setSelectedDate, today,
  loadingSlots, slots, selectedSlot, setSelectedSlot,
  walletBalance, saldoOk, onAddCredits, onProximo,
}) => (
  <div className="flex flex-col max-h-[90vh] overflow-hidden">
    <div className="px-6 pt-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading font-bold text-ink text-lg m-0">Agendar Consulta</h2>
        <button onClick={onBack} aria-label="Fechar" className="text-muted hover:text-ink w-8 h-8 rounded-full flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>
      {sistemaInfo && !sistemaInfo.aberto && (
        <div className="bg-error-wash border border-error/30 rounded-xl p-4 mb-4">
          <p className="font-semibold text-error mb-1 text-sm">Sistema fechado no momento</p>
          <p className="text-error m-0 text-[13px]">{sistemaInfo.motivo}</p>
        </div>
      )}
      <div className="mb-4">
        <label className={lbl}>Data da consulta</label>
        <input type="date" value={selectedDate} min={today} onChange={e => setSelectedDate(e.target.value)}
          className={`${inp} rounded-xl px-3 py-2.5`} />
      </div>
      <label className={lbl}>Horário disponível</label>
    </div>
    <div className="overflow-y-auto flex-1 max-h-[300px] px-6 pb-2">
      {loadingSlots ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-brand animate-spin" />
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-surface rounded-xl py-5 text-center">
          <p className="text-muted text-sm m-0">Sem horários disponíveis nesta data.</p>
          <p className="text-line text-xs mt-1">Tente outra data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map(hora => (
            <button
              key={hora}
              onClick={() => setSelectedSlot(hora)}
              className={`py-2.5 rounded-xl text-sm font-semibold border ${
                selectedSlot === hora ? 'bg-brand text-brand-contrast border-brand' : 'bg-canvas text-ink border-line'
              }`}
            >
              {hora}
            </button>
          ))}
        </div>
      )}
    </div>
    <div className="border-t border-line p-4 bg-canvas rounded-b-2xl">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted">Seu saldo</span>
        <span className={`text-sm font-bold ${walletBalance === null ? 'text-muted' : saldoOk ? 'text-success' : 'text-error'}`}>
          {walletBalance === null ? '...' : `R$ ${walletBalance.toFixed(2).replace('.', ',')}`}
        </span>
      </div>
      {walletBalance !== null && !saldoOk && (
        <div className="bg-error-wash border border-error/30 rounded-xl p-3 mb-3 text-center">
          <p className="font-semibold text-error mb-0.5 text-sm">Saldo insuficiente</p>
          <button onClick={onAddCredits} className="text-error text-xs underline">
            Adicionar créditos à carteira
          </button>
        </div>
      )}
      {selectedSlot && (
        <button
          onClick={onProximo}
          disabled={!saldoOk}
          className={`block w-full py-3 rounded-lg text-[15px] font-bold mb-2 ${saldoOk ? 'bg-brand text-brand-contrast' : 'bg-muted text-white cursor-not-allowed'}`}
        >
          Próximo → Triagem ({selectedSlot})
        </button>
      )}
      <button onClick={onBack} className="block w-full py-2.5 bg-transparent border border-line rounded-lg text-sm font-medium text-muted">
        Cancelar
      </button>
    </div>
  </div>
);

export default SelecaoDataHorario;
