import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import CheckoutPix from './CheckoutPix';
import TermoConsentimento from './TermoConsentimento';

const API_URL_CONSENT = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

const fmtDateShort = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const groupByDate = (slots) => {
  const map = {};
  slots.forEach((s) => {
    const key = fmtDateShort(s.dateTime);
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  return map;
};

// ── sub-components ────────────────────────────────────────────────────────────

const StepIndicator = ({ current }) => (
  <div className="flex items-center gap-1 mb-6">
    {['Farmacêutico', 'Horário', 'Confirmar'].map((label, i) => {
      const step = i + 1;
      const done    = step < current;
      const active  = step === current;
      return (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
              done   ? 'bg-violet-600 text-white' :
              active ? 'bg-violet-700 text-white ring-4 ring-violet-100' :
                       'bg-gray-100 text-gray-400'
            }`}>
              {done ? '✓' : step}
            </div>
            <span className={`text-[10px] font-semibold ${active ? 'text-violet-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < 2 && (
            <div className={`flex-1 h-0.5 mb-4 transition ${done ? 'bg-violet-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Etapa 1: Farmacêutico ─────────────────────────────────────────────────────

const Step1 = ({ onSelect }) => {
  const [pharmacists, setPharmacists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/pharmacists`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setPharmacists(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return pharmacists;
    return pharmacists.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.pharmacistProfile?.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [pharmacists, query]);

  return (
    <div className="flex flex-col h-full">
      <h2 className="font-bold text-gray-900 text-base mb-1">Escolha o farmacêutico</h2>
      <p className="text-xs text-gray-500 mb-4">Selecione com quem deseja fazer sua consulta</p>

      <input
        type="text"
        placeholder="Buscar por nome ou especialidade..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-violet-400 outline-none"
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">Nenhum farmacêutico encontrado.</p>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {filtered.map((p) => {
            const profile = p.pharmacistProfile;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-violet-400 hover:bg-violet-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {initials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                      {profile?.isOnline && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          Online
                        </span>
                      )}
                      {p.avgNota && (
                        <span className="text-[10px] text-yellow-600 font-semibold">
                          ★ {p.avgNota.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">CRF {profile?.crfNumber}/{profile?.crfUF}</p>
                    {profile?.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {profile.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-violet-500 shrink-0 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Etapa 2: Horário ──────────────────────────────────────────────────────────

const Step2 = ({ pharmacist, onSelect, onBack }) => {
  const [slots, setSlots]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const profile = pharmacist.pharmacistProfile;
  const preco   = parseFloat(profile?.precoConsulta ?? 50);

  useEffect(() => {
    fetch(`${API_URL}/api/pharmacists/${pharmacist.id}/availability`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setSlots(data); setLoading(false); });
  }, [pharmacist.id]);

  const grouped = groupByDate(slots);

  return (
    <div className="flex flex-col h-full">
      {/* Resumo do farmacêutico */}
      <button onClick={onBack} className="flex items-center gap-2 mb-4 group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {initials(pharmacist.name)}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition">{pharmacist.name}</p>
          <p className="text-[10px] text-gray-400">← Trocar farmacêutico</p>
        </div>
      </button>

      <h2 className="font-bold text-gray-900 text-base mb-1">Escolha o horário</h2>
      <p className="text-xs text-gray-500 mb-4">
        30 min · R$ {preco.toFixed(2).replace('.', ',')} em créditos
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2 animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 w-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-3xl mb-2">🗓️</p>
          <p className="text-sm text-gray-500">Nenhum horário disponível no momento.</p>
          <button onClick={onBack} className="mt-4 text-sm text-violet-600 hover:underline">
            Escolher outro farmacêutico
          </button>
        </div>
      ) : (
        <div className="space-y-5 overflow-y-auto flex-1 pr-1">
          {Object.entries(grouped).map(([date, daySlots]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{date}</p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                      selectedSlot?.id === slot.id
                        ? 'bg-violet-700 text-white border-violet-700'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-violet-400'
                    }`}
                  >
                    {fmtTime(slot.dateTime)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSlot && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="bg-violet-50 rounded-xl px-4 py-3 mb-3 text-sm text-violet-800">
            <strong>{fmtDate(selectedSlot.dateTime)}</strong> às <strong>{fmtTime(selectedSlot.dateTime)}</strong>
          </div>
          <button
            onClick={() => onSelect(selectedSlot)}
            className="w-full bg-violet-700 hover:bg-violet-800 text-white font-bold py-3 rounded-xl text-sm transition"
          >
            Próximo →
          </button>
        </div>
      )}
    </div>
  );
};

// ── Etapa 3: Confirmar ────────────────────────────────────────────────────────

const Step3 = ({ pharmacist, slot, onBooked, onAddCredits, onBack }) => {
  const { token } = useAuth();
  const [saldo, setSaldo]             = useState(null);
  const [booking, setBooking]         = useState(false);
  const [error, setError]             = useState('');
  const [insufficiente, setInsuficiente] = useState(null);

  const profile = pharmacist.pharmacistProfile;
  const preco   = parseFloat(profile?.precoConsulta ?? 50);

  useEffect(() => {
    fetch(`${API_URL}/api/carteira/saldo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setSaldo(data.saldo_disponivel));
  }, [token]);

  const handleConfirm = async () => {
    setBooking(true);
    setError('');
    setInsuficiente(null);
    try {
      const res = await fetch(`${API_URL}/api/agendamentos/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_slot: slot.id }),
      });
      const data = await res.json();
      if (res.ok) { onBooked(); return; }
      if (res.status === 402) {
        setInsuficiente({ saldo_atual: data.saldo_atual, valor_necessario: data.valor_necessario });
      } else {
        setError(data.error || 'Erro ao agendar.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setBooking(false);
    }
  };

  const saldoOk = saldo !== null && saldo >= preco;

  return (
    <div className="flex flex-col h-full">
      <h2 className="font-bold text-gray-900 text-base mb-1">Confirmar agendamento</h2>
      <p className="text-xs text-gray-500 mb-5">Revise os detalhes antes de confirmar</p>

      {/* Resumo */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials(pharmacist.name)}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{pharmacist.name}</p>
            <p className="text-xs text-gray-400">CRF {profile?.crfNumber}/{profile?.crfUF}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Data</p>
            <p className="font-semibold text-gray-800 capitalize">{fmtDate(slot.dateTime)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Horário</p>
            <p className="font-semibold text-gray-800">{fmtTime(slot.dateTime)} · 30 min</p>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">Valor da consulta</p>
          <p className="font-bold text-gray-900">R$ {preco.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      {/* Saldo */}
      <div className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between ${
        saldo === null ? 'bg-gray-50' :
        saldoOk ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}>
        <div>
          <p className="text-xs font-semibold text-gray-600">Seu saldo</p>
          <p className={`text-lg font-bold ${saldo === null ? 'text-gray-400' : saldoOk ? 'text-green-700' : 'text-red-600'}`}>
            {saldo === null ? '...' : `R$ ${saldo.toFixed(2).replace('.', ',')}`}
          </p>
        </div>
        {saldo !== null && !saldoOk && (
          <button
            onClick={onAddCredits}
            className="text-xs font-bold bg-violet-700 text-white px-3 py-2 rounded-lg hover:bg-violet-800 transition"
          >
            Adicionar créditos
          </button>
        )}
        {saldoOk && <span className="text-green-600 text-xl font-bold">✓</span>}
      </div>

      {/* Erro de race condition */}
      {insufficiente && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
          <p className="text-sm font-semibold text-red-700 mb-1">Saldo insuficiente</p>
          <p className="text-xs text-red-600 mb-2">
            Você tem R$ {insufficiente.saldo_atual.toFixed(2).replace('.', ',')} e precisa de{' '}
            R$ {insufficiente.valor_necessario.toFixed(2).replace('.', ',')}.
          </p>
          <button onClick={onAddCredits} className="w-full bg-violet-700 text-white text-xs font-bold py-2 rounded-lg hover:bg-violet-800 transition">
            Adicionar créditos
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3">{error}</p>}

      <div className="mt-auto flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          ← Voltar
        </button>
        <button
          onClick={handleConfirm}
          disabled={booking || !saldoOk}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
        >
          {booking ? 'Agendando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
};

// ── Tela de sucesso ───────────────────────────────────────────────────────────

const StepSuccess = ({ pharmacist, slot, onClose }) => (
  <div className="flex flex-col items-center justify-center h-full text-center py-8">
    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
      <span className="text-3xl">✓</span>
    </div>
    <h2 className="font-bold text-gray-900 text-lg mb-2">Consulta agendada!</h2>
    <p className="text-sm text-gray-600 mb-1">
      <strong>{pharmacist.name}</strong>
    </p>
    <p className="text-sm text-gray-500 mb-6 capitalize">
      {fmtDate(slot.dateTime)} às {fmtTime(slot.dateTime)}
    </p>
    <p className="text-xs text-gray-400 mb-6 max-w-xs">
      O farmacêutico entrará em contato pelo WhatsApp no horário da consulta.
    </p>
    <button
      onClick={onClose}
      className="w-full max-w-xs bg-violet-700 hover:bg-violet-800 text-white font-bold py-3 rounded-xl text-sm transition"
    >
      Ver meus agendamentos
    </button>
  </div>
);

// ── Wizard principal ──────────────────────────────────────────────────────────

const BookingWizard = ({ onClose, onBooked }) => {
  const { token }                           = useAuth();
  const [step, setStep]                     = useState(1);
  const [pharmacist, setPharmacist]         = useState(null);
  const [slot, setSlot]                     = useState(null);
  const [showTopup, setShowTopup]           = useState(false);
  const [consentOk, setConsentOk]           = useState(null); // null=loading, true=ok, false=pendente
  const [showConsent, setShowConsent]       = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL_CONSENT}/api/consent/telefarmacia`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) { setConsentOk(true); return; } // falha silenciosa — não bloquear
        if (d.aceito) { setConsentOk(true); }
        else          { setConsentOk(false); setShowConsent(true); }
      })
      .catch(() => setConsentOk(true)); // erro de rede — não bloquear
  }, [token]);

  const handleBooked = () => {
    setStep('success');
    onBooked?.();
  };

  if (showConsent) {
    return (
      <TermoConsentimento
        onAceito={() => { setConsentOk(true); setShowConsent(false); }}
        onFechar={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
           style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <div className="flex-1">
            {step !== 'success' && <StepIndicator current={step} />}
          </div>
          <button
            onClick={onClose}
            className="ml-4 mb-6 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col min-h-0">
          {showTopup ? (
            <div className="flex flex-col h-full">
              <button
                onClick={() => setShowTopup(false)}
                className="text-sm text-gray-400 hover:text-gray-700 mb-4 flex items-center gap-1 transition"
              >
                ← Voltar
              </button>
              <CheckoutPix
                onSuccess={() => setShowTopup(false)}
                onCancel={() => setShowTopup(false)}
              />
            </div>
          ) : step === 1 ? (
            <Step1 onSelect={(p) => { setPharmacist(p); setStep(2); }} />
          ) : step === 2 ? (
            <Step2
              pharmacist={pharmacist}
              onSelect={(s) => { setSlot(s); setStep(3); }}
              onBack={() => setStep(1)}
            />
          ) : step === 3 ? (
            <Step3
              pharmacist={pharmacist}
              slot={slot}
              onBooked={handleBooked}
              onAddCredits={() => setShowTopup(true)}
              onBack={() => setStep(2)}
            />
          ) : (
            <StepSuccess pharmacist={pharmacist} slot={slot} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingWizard;
