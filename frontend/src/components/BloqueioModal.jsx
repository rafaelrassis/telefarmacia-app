import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fmtDT = (iso) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const BloqueioModal = ({ onClose, onSaved }) => {
  const { token } = useAuth();

  const [dataInicio, setDataInicio]   = useState(todayStr());
  const [horaInicio, setHoraInicio]   = useState('08:00');
  const [dataFim,    setDataFim]      = useState(todayStr());
  const [horaFim,    setHoraFim]      = useState('18:00');
  const [motivo,     setMotivo]       = useState('');
  const [diaInteiro, setDiaInteiro]   = useState(false);

  const [saving,    setSaving]    = useState(false);
  const [conflitos, setConflitos] = useState(null);
  const [erro,      setErro]      = useState('');

  const buildISO = (date, time) => `${date}T${time}:00`;

  const handleSubmit = async (forcar = false) => {
    setErro('');
    setSaving(true);

    const hI = diaInteiro ? '00:00' : horaInicio;
    const hF = diaInteiro ? '23:59' : horaFim;

    if (!forcar && new Date(buildISO(dataInicio, hI)) >= new Date(buildISO(dataFim, hF))) {
      setErro('O horário de início deve ser antes do fim.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/bloqueios`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dataInicio: buildISO(dataInicio, hI),
          dataFim:    buildISO(dataFim, hF),
          motivo:     motivo.trim() || undefined,
          forcar,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setConflitos(data.conflitos ?? []);
      } else if (res.ok) {
        onSaved?.();
        onClose();
      } else {
        setErro(data.error || 'Erro ao criar bloqueio.');
      }
    } catch {
      setErro('Falha de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const HOURS = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, '0')}:00`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">Novo bloqueio de agenda</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none transition"
          >
            ×
          </button>
        </div>

        {/* Conflitos detectados */}
        {conflitos && (
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">
              ⚠️ {conflitos.length} consulta{conflitos.length !== 1 ? 's' : ''} neste período
            </p>
            <ul className="space-y-1 mb-3 max-h-40 overflow-y-auto">
              {conflitos.map((c) => (
                <li key={c.id} className="text-xs text-amber-700">
                  • {c.pacienteNome} — {fmtDT(c.dataHora)}{' '}
                  <span className="text-amber-500">({c.tipo})</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 mb-3">
              As consultas <strong>não serão canceladas automaticamente</strong>. Você precisará tratar cada uma individualmente.
              Ao confirmar, os pacientes serão notificados que precisam reagendar.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConflitos(null)}
                className="flex-1 border border-amber-300 text-amber-800 text-xs font-semibold py-2 rounded-lg hover:bg-amber-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition"
              >
                {saving ? 'Salvando...' : 'Confirmar assim mesmo'}
              </button>
            </div>
          </div>
        )}

        {/* Formulário */}
        {!conflitos && (
          <div className="px-6 py-5 space-y-4">
            {/* Toggle dia inteiro */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setDiaInteiro((v) => !v)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors ${diaInteiro ? 'bg-violet-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${diaInteiro ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm text-gray-700">Dia inteiro</span>
            </label>

            {/* Data início */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data início</label>
                <input
                  type="date"
                  value={dataInicio}
                  min={todayStr()}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              {!diaInteiro && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora início</label>
                  <select
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Data fim */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data fim</label>
                <input
                  type="date"
                  value={dataFim}
                  min={dataInicio}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              {!diaInteiro && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora fim</label>
                  <select
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Motivo (opcional)</label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Férias, consulta médica, almoço..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>

            {erro && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="flex-1 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition"
              >
                {saving ? 'Salvando...' : 'Criar bloqueio'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BloqueioModal;
