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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-base">
            {initial ? 'Editar template' : 'Novo template'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Orientação para hipertensão"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Conteúdo</label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={8}
              placeholder={`Escreva o texto do template.\nUse placeholders: ${PLACEHOLDER_HINT}`}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">
              Placeholders disponíveis: <code className="font-mono bg-slate-100 px-1 rounded">{'{{paciente_nome}}'}</code>,{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{'{{data}}'}</code>,{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{'{{farmaceutico_nome}}'}</code>
            </p>
          </div>

          {err && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{err}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-bold bg-violet-700 hover:bg-violet-800 text-white rounded-xl transition disabled:opacity-50"
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
