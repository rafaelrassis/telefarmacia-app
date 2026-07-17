import React, { useState, useCallback, useEffect } from 'react';
import { UserPlus, Trash2, Lock } from 'lucide-react';
import Modal from '../ui/Modal';
import AlterarSenhaForm from '../AlterarSenhaForm.jsx';

// ── Aba "Administradores" ────────────────────────────────────────────────────

const AdminsTab = ({ api, showToast, currentUserEmail }) => {
  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding]     = useState(false);
  const [removing, setRemoving] = useState({});
  const [confirmRemove, setConfirmRemove] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/api/admin/admins');
      if (res.ok) {
        const d = await res.json();
        setAdmins(d.data ?? []);
      }
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    try {
      const res = await api('/api/admin/admins', { method: 'POST', body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('success', 'Administrador adicionado!');
        setNewEmail('');
        load();
      } else {
        showToast('error', d.error || 'Erro ao adicionar administrador.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setAdding(false); }
  };

  const handleRemove = async (email) => {
    setRemoving((r) => ({ ...r, [email]: true }));
    try {
      const res = await api(`/api/admin/admins/${encodeURIComponent(email)}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('success', 'Administrador removido.');
        setConfirmRemove(null);
        load();
      } else {
        showToast('error', d.error || 'Erro ao remover administrador.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setRemoving((r) => ({ ...r, [email]: false })); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-canvas border border-line rounded-xl p-5">
        <h3 className="font-semibold text-ink text-sm mb-3">Adicionar administrador</h3>
        <div className="flex gap-2 flex-wrap">
          <label htmlFor="admin-novo-email" className="sr-only">E-mail do novo administrador</label>
          <input
            id="admin-novo-email"
            type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 min-w-[240px] border border-line rounded-lg px-3 py-2 text-sm text-ink focus:ring-2 focus:ring-brand outline-none bg-canvas"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-brand hover:bg-brand-deep text-white px-4 py-2 rounded-lg disabled:opacity-40 transition"
          >
            <UserPlus className="w-4 h-4" />
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          O e-mail precisa corresponder à conta usada no login. Acesso liberado imediatamente.
        </p>
      </div>

      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Nenhum administrador configurado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Origem</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {admins.map((a) => (
                  <tr key={a.email} className="hover:bg-surface transition">
                    <td className="px-4 py-3 font-medium text-ink">
                      {a.email}
                      {a.email === currentUserEmail && <span className="ml-2 text-[10px] text-brand font-semibold">(você)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.origem === 'env' ? 'bg-surface text-muted' : 'bg-brand-wash text-brand-deep'
                      }`}>
                        {a.origem === 'env' ? 'Variável de ambiente' : 'Painel'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.removivel && a.email !== currentUserEmail && (
                        <button
                          onClick={() => setConfirmRemove(a.email)}
                          disabled={removing[a.email]}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-error hover:text-error/80 disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-canvas border border-line rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          <Lock className="w-3.5 h-3.5" /> Segurança — Alterar minha senha
        </div>
        <div className="max-w-md">
          <AlterarSenhaForm />
        </div>
      </div>

      {confirmRemove && (
        <Modal
          title="Remover administrador?"
          onClose={() => setConfirmRemove(null)}
          maxWidth="max-w-sm"
          footer={(
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-line rounded-xl hover:bg-surface transition text-ink">
                Cancelar
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removing[confirmRemove]}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-error text-white rounded-xl hover:bg-error/90 disabled:opacity-60 transition">
                {removing[confirmRemove] ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          )}
        >
          <div className="px-6 pt-4 pb-2">
            <p className="text-sm text-ink">
              <strong>{confirmRemove}</strong> perderá acesso ao painel administrativo.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminsTab;
