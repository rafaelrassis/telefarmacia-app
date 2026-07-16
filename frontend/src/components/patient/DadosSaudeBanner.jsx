import React, { useState, useEffect } from 'react';
import { HeartPulse, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DadosSaudeForm from './DadosSaudeForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DISMISS_KEY = 'farmaconsulta_saude_dismiss';

const isIncompleto = (d) => !d?.peso && !d?.altura && !d?.alergias;

const readDismissed = () => {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}'); } catch { return {}; }
};

// selectedPerson: null (titular) ou { id, nome, dadosSaude } (dependente, já vem da lista de dependentes)
const DadosSaudeBanner = ({ selectedPerson, nomeTitular, onVisibleChange }) => {
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

  const visible = !loading && !dismissed && !justSaved && isIncompleto(dadosSaude);
  useEffect(() => { onVisibleChange?.(visible); }, [visible, onVisibleChange]);

  const handleDismiss = () => {
    const next = { ...readDismissed(), [personId ?? 'titular']: true };
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <>
      <div className="shrink-0 w-[230px] rounded-2xl border border-line bg-canvas p-4 flex flex-col gap-2 relative">
        <button
          onClick={handleDismiss}
          aria-label="Agora não"
          className="absolute top-3 right-3 text-muted hover:text-ink transition"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="w-8 h-8 rounded-full bg-brand-wash flex items-center justify-center text-brand-deep shrink-0">
          <HeartPulse className="w-4 h-4" strokeWidth={2.5} />
        </span>
        <p className="font-heading text-sm font-bold text-ink">Complete o perfil de saúde de {nome}</p>
        <p className="text-xs text-muted leading-snug flex-1">
          Peso, altura e alergias ajudam o farmacêutico a orientar com mais precisão.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="bg-brand hover:bg-brand-deep text-brand-contrast text-xs font-bold px-3 py-2 rounded-lg transition"
        >
          Preencher
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-canvas rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-heading text-lg font-bold text-ink mb-1">Perfil de saúde</h3>
            <p className="text-sm text-muted mb-4">Dados de {nome}, sempre editáveis depois.</p>
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
