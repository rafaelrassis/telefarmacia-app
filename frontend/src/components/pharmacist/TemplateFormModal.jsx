import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PLACEHOLDER_HINT } from '../../utils/pharmacistFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TemplateFormModal = ({ initial, onClose, onSaved }) => {
  const { token } = useAuth();
  const [titulo,    setTitulo]   = useState(initial?.titulo   ?? '');
  const [conteudo,  setConteudo] = useState(initial?.conteudo ?? '');
  const [saving,    setSaving]   = useState(false);
  const [err,       setErr]      = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) {
      setErr('Título e conteúdo são obrigatórios.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const url    = initial
        ? `${API_URL}/api/farmaceutico/templates/${initial.id}`
        : `${API_URL}/api/farmaceutico/templates`;
      const method = initial ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ titulo: titulo.trim(), conteudo: conteudo.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErr(d.error || 'Erro ao salvar.');
        return;
      }
      onSaved(await res.json());
    } catch {
      setErr('Falha de conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
      <div className="bg-canvas border border-line rounded-2xl shadow-md w-full max-w-lg">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-bold text-ink text-base">
            {initial ? 'Editar template' : 'Novo template'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Orientação para hipertensão"
              className="w-full border border-line rounded-xl px-4 py-2.5 text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Conteúdo</label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={8}
              placeholder={`Escreva o texto do template.\nUse placeholders: ${PLACEHOLDER_HINT}`}
              className="w-full border border-line rounded-xl px-4 py-2.5 text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-brand resize-y font-mono"
            />
            <p className="text-xs text-muted mt-1">
              Placeholders disponíveis: <code className="font-mono bg-surface px-1 rounded">{'{{paciente_nome}}'}</code>,{' '}
              <code className="font-mono bg-surface px-1 rounded">{'{{data}}'}</code>,{' '}
              <code className="font-mono bg-surface px-1 rounded">{'{{farmaceutico_nome}}'}</code>
            </p>
          </div>

          {err && (
            <p className="text-xs text-error bg-error-wash border border-error/30 rounded-xl px-4 py-3">{err}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted border border-line rounded-xl hover:bg-surface transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-bold bg-brand hover:bg-brand-deep text-brand-contrast rounded-xl transition disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateFormModal;
