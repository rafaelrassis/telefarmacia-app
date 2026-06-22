import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SUGGESTIONS = [
  'dipirona',
  'paracetamol',
  'ibuprofeno',
  'vitamina C',
  'omeprazol',
  'loratadina',
];

const CompleteAppointmentModal = ({ appointment, onClose, onCompleted }) => {
  const { token } = useAuth();
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const insertSuggestion = (term) => {
    setRecommendations((prev) =>
      prev ? `${prev.trimEnd()}, ${term}` : term
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/appointments/${appointment.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recommendations }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao encerrar consulta.');
        return;
      }
      onCompleted(data.appointment);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Encerrar Consulta</h3>
          <p className="text-sm text-gray-500 mt-1">
            Paciente: <span className="font-medium text-gray-700">{appointment.patient?.name}</span>
            {' · '}
            {new Date(appointment.dateTime).toLocaleString('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Recomendações para o paciente
            <span className="font-normal text-gray-400 ml-1">(opcional)</span>
          </label>
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Ex: Indicado o uso de dipirona 500mg para controle da febre. Manter hidratação e repouso. Vitamina C pode ser utilizada como suporte..."
            rows={5}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />

          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Inserir medicamento rapidamente:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => insertSuggestion(s)}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition font-medium"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm transition disabled:opacity-50"
          >
            {loading ? 'Encerrando...' : 'Encerrar Consulta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteAppointmentModal;
