import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Stars = ({ value, size = 'text-sm' }) => (
  <span className="leading-none">
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} className={`${size} ${s <= value ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
    ))}
  </span>
);

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const groupByDate = (slots) => {
  const map = {};
  slots.forEach((s) => {
    const key = fmtDate(s.dateTime);
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  return map;
};

const PharmacistProfile = ({ pharmacist, walletBalance, onBack, onAddCredits, onBooked }) => {
  const { token } = useAuth();
  const [slots, setSlots]           = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking]       = useState(false);
  const [error, setError]           = useState('');
  const [insufficiente, setInsuficiente] = useState(null);
  const [reviews, setReviews]       = useState(null);
  const profile = pharmacist.pharmacistProfile;

  const preco = parseFloat(profile?.precoConsulta ?? 50);

  useEffect(() => {
    fetch(`${API_URL}/api/pharmacists/${pharmacist.id}/availability`)
      .then((r) => r.ok ? r.json() : [])
      .then(setSlots);

    fetch(`${API_URL}/api/farmaceuticos/${pharmacist.id}/avaliacoes`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setReviews(data));
  }, [pharmacist.id]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    setError('');
    setInsuficiente(null);
    try {
      const res = await fetch(`${API_URL}/api/agendamentos/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_slot: selectedSlot.id }),
      });
      const data = await res.json();
      if (res.ok) {
        onBooked();
        return;
      }
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

  const grouped = groupByDate(slots);

  return (
    <div className="max-w-xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition"
      >
        ← Voltar
      </button>

      {/* Header do farmacêutico */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
            {pharmacist.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{pharmacist.name}</h2>
            <p className="text-xs text-gray-400 mb-2">CRF {profile?.crfNumber}/{profile?.crfUF}</p>
            {profile?.bio && (
              <p className="text-sm text-gray-600 italic">"{profile.bio}"</p>
            )}
            {profile?.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horários */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">Horários disponíveis</h3>

        {slots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🗓️</p>
            <p className="text-sm text-gray-500">Nenhum horário disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([date, daySlots]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {date}
                </p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => { setSelectedSlot(slot); setInsuficiente(null); setError(''); }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        selectedSlot?.id === slot.id
                          ? 'bg-violet-700 text-white border-violet-700'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'
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
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="bg-violet-50 rounded-lg px-4 py-3 mb-3">
              <p className="text-sm text-violet-800">
                <strong>Horário selecionado:</strong>{' '}
                {fmtDate(selectedSlot.dateTime)} às {fmtTime(selectedSlot.dateTime)}
              </p>
              <p className="text-xs text-violet-600 mt-0.5">
                30 min · R$ {preco.toFixed(2).replace('.', ',')} em créditos
              </p>
              {walletBalance !== null && (
                <p className={`text-xs mt-1 font-semibold ${walletBalance >= preco ? 'text-green-700' : 'text-red-600'}`}>
                  Seu saldo: R$ {walletBalance.toFixed(2).replace('.', ',')}
                  {walletBalance >= preco ? ' ✓' : ' — insuficiente'}
                </p>
              )}
            </div>

            {/* Erro de saldo insuficiente */}
            {insufficiente && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
                <p className="text-sm font-semibold text-red-700 mb-1">Saldo insuficiente</p>
                <p className="text-xs text-red-600 mb-2">
                  Você tem R$ {insufficiente.saldo_atual.toFixed(2).replace('.', ',')} e precisa de{' '}
                  R$ {insufficiente.valor_necessario.toFixed(2).replace('.', ',')}.
                </p>
                <button
                  onClick={onAddCredits}
                  className="w-full bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold py-2 rounded-lg transition"
                >
                  Adicionar créditos
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>
            )}

            <button
              onClick={handleBook}
              disabled={booking}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {booking ? 'Agendando...' : 'Confirmar consulta com créditos'}
            </button>
          </div>
        )}
      </div>

      {/* Avaliações */}
      {reviews && reviews.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-gray-800 text-sm">Avaliações</h3>
            <span className="text-yellow-400 font-bold text-sm">★ {reviews.media?.toFixed(1)}</span>
            <span className="text-xs text-gray-400">
              ({reviews.total} avaliação{reviews.total !== 1 ? 'ões' : ''})
            </span>
          </div>
          <div className="space-y-3">
            {reviews.avaliacoes.slice(0, 5).map((av, i) => (
              <div key={i} className="pb-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Stars value={av.nota} />
                  <span className="text-xs font-semibold text-gray-700">{av.paciente_nome}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(av.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {av.comentario && (
                  <p className="text-xs text-gray-600 italic">"{av.comentario}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacistProfile;
