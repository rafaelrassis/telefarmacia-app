import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PLACEHOLDER_HINT } from '../../utils/pharmacistFormat';
import TemplateFormModal from './TemplateFormModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TemplatesTab = () => {
  const { token } = useAuth();
  const [templates,   setTemplates]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalData,   setModalData]   = useState(null); // null = fechado, {} = novo, {id,...} = edição
  const [deletingId,  setDeletingId]  = useState(null);
  const [msg,         setMsg]         = useState(null);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSaved = (saved) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      return idx >= 0
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [...prev, saved].sort((a, b) => a.titulo.localeCompare(b.titulo));
    });
    setModalData(null);
    showMsg('success', modalData?.id ? 'Template atualizado.' : 'Template criado.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este template?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/api/farmaceutico/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        showMsg('success', 'Template removido.');
      } else {
        const d = await res.json();
        showMsg('error', d.error || 'Erro ao remover.');
      }
    } catch {
      showMsg('error', 'Falha de conexão.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Templates de orientação / receita</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Textos reutilizáveis com placeholders automáticos ({PLACEHOLDER_HINT})
            </p>
          </div>
          <button
            onClick={() => setModalData({})}
            className="shrink-0 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
          >
            + Novo template
          </button>
        </div>

        {msg && (
          <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-xs border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {msg.text}
          </div>
        )}

        <div className="p-5">
          {loading ? (
            <p className="text-slate-400 text-sm text-center py-4">Carregando...</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-slate-400 text-sm">Nenhum template criado ainda.</p>
              <p className="text-slate-400 text-xs mt-1">
                Crie templates para agilizar orientações e receitas nas consultas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="border border-slate-100 rounded-xl px-4 py-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{t.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                        {t.conteudo}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setModalData(t)}
                        className="text-xs text-violet-600 hover:text-violet-800 border border-violet-200 hover:border-violet-400 rounded-lg px-2.5 py-1 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded-lg px-2.5 py-1 transition disabled:opacity-40"
                      >
                        {deletingId === t.id ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalData !== null && (
        <TemplateFormModal
          initial={modalData?.id ? modalData : null}
          onClose={() => setModalData(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default TemplatesTab;
