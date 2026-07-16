import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const endpointFor = (personId) =>
  personId ? `${API_URL}/api/dependentes/${personId}/saude` : `${API_URL}/api/pacientes/dados-saude`;

const DadosSaudeForm = ({ personId = null, onClose, onSaved }) => {
  const { token } = useAuth();
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [alergias, setAlergias] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpointFor(personId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const d = data.dadosSaude || {};
          if (!cancelled) {
            setPeso(d.peso ? String(d.peso) : '');
            setAltura(d.altura ? String(d.altura) : '');
            setAlergias(d.alergias || '');
          }
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [personId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(endpointFor(personId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dadosSaude: {
            peso: peso ? parseFloat(peso) : undefined,
            altura: altura ? parseFloat(altura) : undefined,
            alergias: alergias.trim() || undefined,
          },
        }),
      });
      if (!res.ok) {
        setError('Erro ao salvar. Tente novamente.');
        return;
      }
      onSaved?.();
      onClose?.();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted text-center py-6">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Peso (kg)</label>
          <input
            type="number" min="1" max="400" step="0.1"
            placeholder="Ex: 70"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Altura (cm)</label>
          <input
            type="number" min="30" max="250" step="1"
            placeholder="Ex: 170"
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted mb-1">
          Alergias conhecidas <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          placeholder="Ex: dipirona, penicilina, lactose..."
          value={alergias}
          onChange={(e) => setAlergias(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-error bg-error-wash px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-line rounded-xl text-sm font-semibold text-muted hover:bg-surface transition"
          >
            Agora não
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-brand hover:bg-brand-deep disabled:opacity-50 text-brand-contrast font-bold py-2.5 rounded-xl transition text-sm"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};

export default DadosSaudeForm;
