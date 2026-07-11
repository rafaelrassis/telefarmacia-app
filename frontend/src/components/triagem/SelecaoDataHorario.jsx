import React from 'react';
import { inp, lbl } from './shared';

const SelecaoDataHorario = ({
  onBack, sistemaInfo, selectedDate, setSelectedDate, today,
  loadingSlots, slots, selectedSlot, setSelectedSlot,
  walletBalance, saldoOk, onAddCredits, onProximo,
}) => (
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
          <div style={{ width: 20, height: 20, border: '2px solid #3B9FE0', borderTopColor: 'transparent', borderRadius: '50%' }} />
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
              background: '#3B9FE0', color: '#fff', border: 'none', borderRadius: 12,
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
        <button onClick={onProximo} disabled={!saldoOk} style={{
          background: saldoOk ? '#3B9FE0' : '#9ca3af', color: 'white', padding: 12, width: '100%',
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

export default SelecaoDataHorario;
