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
      <div className="bg-canvas border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="font-bold text-ink text-sm">Templates de orientação / receita</h3>
            <p className="text-xs text-muted mt-0.5">
              Textos reutilizáveis com placeholders automáticos ({PLACEHOLDER_HINT})
            </p>
          </div>
          <button
            onClick={() => setModalData({})}
            className="shrink-0 bg-brand hover:bg-brand-deep text-brand-contrast text-xs font-bold px-3 py-2 rounded-xl transition"
          >
            + Novo template
          </button>
        </div>

        {msg && (
          <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-xs border ${msg.type === 'success' ? 'bg-success-wash border-success/30 text-success' : 'bg-error-wash border-error/30 text-error'}`}>
            {msg.text}
          </div>
        )}

        <div className="p-5">
          {loading ? (
            <p className="text-muted text-sm text-center py-4">Carregando...</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-muted text-sm">Nenhum template criado ainda.</p>
              <p className="text-muted text-xs mt-1">
                Crie templates para agilizar orientações e receitas nas consultas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="border border-line rounded-xl px-4 py-3 hover:bg-surface transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{t.titulo}</p>
                      <p className="text-xs text-muted mt-1 line-clamp-2 whitespace-pre-wrap">
                        {t.conteudo}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setModalData(t)}
                        className="text-xs text-brand-deep hover:text-brand border border-brand/30 hover:border-brand rounded-lg px-2.5 py-1 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-xs text-error/80 hover:text-error border border-error/20 hover:border-error/40 rounded-lg px-2.5 py-1 transition disabled:opacity-40"
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
