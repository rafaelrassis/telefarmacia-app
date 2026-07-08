import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DadosSaudeForm from './DadosSaudeForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DISMISS_KEY = 'farmaconsulta_saude_dismiss';

const isIncompleto = (d) => !d?.peso && !d?.altura && !d?.alergias;

const readDismissed = () => {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}'); } catch { return {}; }
};

// selectedPerson: null (titular) ou { id, nome, dadosSaude } (dependente, já vem da lista de dependentes)
const DadosSaudeBanner = ({ selectedPerson, nomeTitular }) => {
  const { token } = useAuth();
  const personId = selectedPerson?.id ?? null;
  const nome = selectedPerson ? selectedPerson.nome?.split(' ')[0] : (nomeTitular?.split(' ')[0] || 'você');

  const [dadosSaude, setDadosSaude] = useState(selectedPerson?.dadosSaude ?? null);
  const [loading, setLoading] = useState(!selectedPerson);
  const [showForm, setShowForm] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [dismissed, setDismissed] = useState(() => Boolean(readDismissed()[personId ?? 'titular']));

  useEffect(() => {
    setDismissed(Boolean(readDismissed()[personId ?? 'titular']));
    if (selectedPerson) {
      setDadosSaude(selectedPerson.dadosSaude ?? {});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/api/pacientes/dados-saude`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setDadosSaude(data?.dadosSaude ?? {}); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [personId, token]);

  const handleDismiss = () => {
    const next = { ...readDismissed(), [personId ?? 'titular']: true };
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
    setDismissed(true);
  };

  if (loading || dismissed || justSaved || !isIncompleto(dadosSaude)) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🩺</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Complete o perfil de saúde de {nome}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Peso, altura e alergias ajudam o farmacêutico a orientar com mais precisão — nunca é obrigatório.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition"
          >
            Agora não
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand hover:bg-brand-deep text-white text-xs font-bold px-3 py-1.5 rounded-lg transition whitespace-nowrap"
          >
            Preencher
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-heading text-lg font-bold text-gray-900 mb-1">Perfil de saúde</h3>
            <p className="text-sm text-gray-500 mb-4">Dados de {nome}, sempre editáveis depois.</p>
            <DadosSaudeForm
              personId={personId}
              onClose={() => setShowForm(false)}
              onSaved={() => setJustSaved(true)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DadosSaudeBanner;
