import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CompleteAppointmentModal from './CompleteAppointmentModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Status labels ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  // Legado (Appointment)
  PENDENTE_PAGAMENTO: { label: 'Aguardando pagamento', cls: 'text-orange-500' },
  AGENDADO:           { label: 'Confirmado',           cls: 'text-green-600' },
  CONCLUIDO:          { label: 'Concluído',            cls: 'text-blue-600' },
  CANCELADO:          { label: 'Cancelado',            cls: 'text-red-500' },
  EXPIRADA:           { label: 'Expirada',             cls: 'text-gray-400' },
  // Fila nova
  aguardando:         { label: 'Aguardando farmacêutico', cls: 'text-amber-500' },
  aceito:             { label: 'Em atendimento',          cls: 'text-green-600' },
  concluido:          { label: 'Concluído',               cls: 'text-blue-600' },
  cancelado:          { label: 'Cancelado',               cls: 'text-red-500' },
  expirado:           { label: 'Expirado (reembolsado)',  cls: 'text-gray-400' },
};

const TIPO_BADGE = {
  agendada:    { label: 'Agendada',   cls: 'bg-violet-100 text-violet-700' },
  urgente:     { label: 'Urgente',    cls: 'bg-red-100 text-red-700' },
  appointment: { label: 'Consulta',   cls: 'bg-gray-100 text-gray-600' },
};

// ── Affiliate links (mantido intacto) ────────────────────────────────────────

const AFFILIATE_TERMS = [
  { key: 'dipirona',    link: 'https://drogaraia.com.br/busca?w=dipirona&ref=telefarmacia' },
  { key: 'paracetamol', link: 'https://drogasil.com.br/busca?w=paracetamol&ref=telefarmacia' },
  { key: 'ibuprofeno',  link: 'https://drogaraia.com.br/busca?w=ibuprofeno&ref=telefarmacia' },
  { key: 'vitamina c',  link: 'https://drogaraia.com.br/busca?w=vitamina+c&ref=telefarmacia' },
  { key: 'omeprazol',   link: 'https://drogasil.com.br/busca?w=omeprazol&ref=telefarmacia' },
  { key: 'loratadina',  link: 'https://drogaraia.com.br/busca?w=loratadina&ref=telefarmacia' },
];

const renderAffiliateLinks = (text) => {
  if (!text) return null;
  const matches = AFFILIATE_TERMS.filter((t) => text.toLowerCase().includes(t.key));
  if (matches.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
      <span className="text-xs text-gray-500 w-full mb-1">Compre online com desconto (Parceiros):</span>
      {matches.map((item) => (
        <a key={item.key} href={item.link} target="_blank" rel="noreferrer"
          className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-200 transition font-semibold">
          Comprar {item.key.charAt(0).toUpperCase() + item.key.slice(1)}
        </a>
      ))}
    </div>
  );
};

const Stars = ({ value, onChange, readonly = false, size = 'text-xl' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button"
        onClick={() => !readonly && onChange && onChange(star)}
        className={`${size} transition leading-none ${star <= value ? 'text-yellow-400' : 'text-gray-200'} ${!readonly ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'}`}>
        ★
      </button>
    ))}
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────

const MyAppointments = () => {
  const { token, user } = useAuth();
  const isPharmacist = user?.role === 'FARMACEUTICO';

  const [appointments, setAppointments] = useState([]);
  const [completingAppointment, setCompletingAppointment] = useState(null);
  const [cancellingId, setCancellingId]   = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  const [ratingForm, setRatingForm]               = useState(null);
  const [ratingNota, setRatingNota]               = useState(0);
  const [ratingComentario, setRatingComentario]   = useState('');
  const [ratingLoading, setRatingLoading]         = useState(false);
  const [ratingError, setRatingError]             = useState('');

  const fetchAppointments = useCallback(async () => {
    // Paciente: endpoint unificado (Appointment + FilaAgendada + FilaUrgente)
    // Farmacêutico: endpoint legado (Appointment apenas)
    const url = isPharmacist
      ? `${API_URL}/api/appointments`
      : `${API_URL}/api/paciente/historico`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      if (isPharmacist) {
        // Normaliza formato legado para ter campo `tipo`
        setAppointments(data.map((a) => ({ ...a, tipo: 'appointment', dataHora: a.dateTime, farmaceutico: a.pharmacist })));
      } else {
        setAppointments(data);
      }
    }
  }, [token, isPharmacist]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleCompleted = (updated) => {
    setAppointments((prev) => prev.map((a) => a.id === updated.id ? { ...a, ...updated } : a));
    setCompletingAppointment(null);
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'CANCELADO' } : a));
      }
    } finally {
      setCancellingId(null);
      setConfirmCancel(null);
    }
  };

  const openRatingForm = (app) => {
    setRatingForm({ appointmentId: app.id, pharmacistName: app.farmaceutico?.name ?? app.pharmacist?.name });
    setRatingNota(0); setRatingComentario(''); setRatingError('');
  };

  const handleRating = async () => {
    if (!ratingNota) { setRatingError('Selecione uma nota.'); return; }
    setRatingLoading(true); setRatingError('');
    try {
      const res = await fetch(`${API_URL}/api/avaliacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appointment_id: ratingForm.appointmentId, nota: ratingNota, comentario: ratingComentario || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => a.id === ratingForm.appointmentId
            ? { ...a, avaliacao: { nota: ratingNota, comentario: ratingComentario || null } }
            : a)
        );
        setRatingForm(null);
      } else {
        setRatingError(data.error || 'Erro ao enviar avaliação.');
      }
    } catch { setRatingError('Erro de conexão.'); }
    finally  { setRatingLoading(false); }
  };

  return (
    <div className="w-full mt-8">

      {/* Modal: confirmar cancelamento */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmCancel(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Cancelar consulta?</h3>
            <p className="text-sm text-gray-600 mb-1">
              {new Date(confirmCancel.dataHora ?? confirmCancel.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              {confirmCancel.status === 'AGENDADO'
                ? 'O horário será liberado e seus créditos serão reembolsados automaticamente.'
                : 'O agendamento será cancelado antes do pagamento.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Manter
              </button>
              <button onClick={() => handleCancel(confirmCancel.id)}
                disabled={cancellingId === confirmCancel.id}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition">
                {cancellingId === confirmCancel.id ? 'Cancelando...' : 'Cancelar consulta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: avaliar consulta */}
      {ratingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRatingForm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-1">Avaliar consulta</h3>
            {ratingForm.pharmacistName && <p className="text-sm text-gray-500 mb-4">com {ratingForm.pharmacistName}</p>}
            <Stars value={ratingNota} onChange={setRatingNota} size="text-3xl" />
            <p className="text-xs text-gray-400 mt-1 mb-3">
              {ratingNota === 0 ? 'Toque nas estrelas para avaliar' : ['','Ruim','Regular','Bom','Muito bom','Excelente'][ratingNota]}
            </p>
            <textarea value={ratingComentario} onChange={(e) => setRatingComentario(e.target.value)}
              placeholder="Comentário opcional (máx. 500 caracteres)" maxLength={500} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-violet-500 outline-none" />
            {ratingError && <p className="text-sm text-red-600 mt-2">{ratingError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRatingForm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleRating} disabled={!ratingNota || ratingLoading}
                className="flex-1 py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-violet-800 transition">
                {ratingLoading ? 'Enviando...' : 'Enviar avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completingAppointment && (
        <CompleteAppointmentModal
          appointment={completingAppointment}
          onClose={() => setCompletingAppointment(null)}
          onCompleted={handleCompleted}
        />
      )}

      <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Meus Agendamentos</h2>

      {appointments.length === 0 ? (
        <p className="text-gray-500 italic">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((app) => {
            const tipo      = app.tipo ?? 'appointment';
            const statusCfg = STATUS_CONFIG[app.status] ?? { label: app.status, cls: 'text-gray-500' };
            const tipoBadge = TIPO_BADGE[tipo];
            const dataHora  = app.dataHora ?? app.dateTime;
            const nomeFarm  = app.farmaceutico?.name ?? app.pharmacist?.name;
            const isLegacy  = tipo === 'appointment';

            return (
              <div key={app.id}
                className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 min-w-0">

                  {/* Cabeçalho: data + badge de tipo */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-gray-800">
                      {new Date(dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    {tipoBadge && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoBadge.cls}`}>
                        {tipoBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Farmacêutico ou paciente */}
                  {isPharmacist ? (
                    <>
                      <p className="text-sm text-gray-600">Paciente: {app.patient?.name ?? '—'}</p>
                      {isLegacy && app.status === 'AGENDADO' && app.patient?.pacienteProfile?.telefone && (
                        <p className="text-xs text-gray-400 mt-0.5">Contato: {app.patient.pacienteProfile.telefone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {nomeFarm ? `Farmacêutico(a): ${nomeFarm}` : 'Farmacêutico: aguardando atribuição'}
                    </p>
                  )}

                  {/* Status */}
                  <p className="text-sm font-semibold mt-1">
                    Status: <span className={statusCfg.cls}>{statusCfg.label}</span>
                  </p>

                  {/* Crédito debitado (apenas para fila) */}
                  {!isLegacy && app.creditoDebitado != null && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      R$ {app.creditoDebitado.toFixed(2).replace('.', ',')} debitados
                    </p>
                  )}

                  {/* Recomendações (apenas appointments legados) */}
                  {isLegacy && app.status === 'CONCLUIDO' && app.recommendations && (
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      <p className="font-semibold text-gray-600 mb-1 text-xs uppercase tracking-wide">
                        Recomendações do farmacêutico
                      </p>
                      <p className="italic">"{app.recommendations}"</p>
                      {!isPharmacist && renderAffiliateLinks(app.recommendations)}
                    </div>
                  )}

                  {/* Avaliação (apenas appointments legados concluídos) */}
                  {isLegacy && app.status === 'CONCLUIDO' && !isPharmacist && (
                    <div className="mt-2">
                      {app.avaliacao ? (
                        <div className="flex items-center gap-2">
                          <Stars value={app.avaliacao.nota} readonly size="text-base" />
                          <span className="text-xs text-gray-400">Sua avaliação</span>
                        </div>
                      ) : (
                        <button onClick={() => openRatingForm(app)}
                          className="text-xs text-violet-600 hover:text-violet-800 font-semibold hover:underline transition">
                          ★ Avaliar esta consulta
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Botões de ação — apenas para appointments legados */}
                {isLegacy && (
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {app.status === 'AGENDADO' && isPharmacist && (() => {
                      const tel = app.patient?.pacienteProfile?.telefone;
                      if (!tel) return null;
                      const waNum = `55${tel.replace(/\D/g, '')}`;
                      return (
                        <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
                          className="px-4 py-2 bg-green-500 text-white font-bold rounded hover:bg-green-600 transition text-sm">
                          WhatsApp Paciente
                        </a>
                      );
                    })()}

                    {app.status === 'AGENDADO' && isPharmacist && (
                      <button onClick={() => setCompletingAppointment(app)}
                        className="px-4 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 transition text-sm">
                        Encerrar Consulta
                      </button>
                    )}

                    {(app.status === 'AGENDADO' || app.status === 'PENDENTE_PAGAMENTO') && (
                      <button onClick={() => setConfirmCancel(app)}
                        className="px-4 py-2 bg-white border border-red-200 text-red-500 font-bold rounded hover:bg-red-50 transition text-sm">
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
