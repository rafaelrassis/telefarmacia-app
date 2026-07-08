import React, { useState, useCallback, useEffect } from 'react';

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
        showToast('success', '✅ Administrador adicionado!');
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
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Adicionar administrador</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 min-w-[240px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="text-sm font-semibold bg-brand hover:bg-brand-deep text-white px-4 py-2 rounded-lg disabled:opacity-40 transition"
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          O e-mail precisa corresponder à conta usada no login. Acesso liberado imediatamente.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhum administrador configurado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">Origem</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((a) => (
                <tr key={a.email} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {a.email}
                    {a.email === currentUserEmail && <span className="ml-2 text-[10px] text-brand font-semibold">(você)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      a.origem === 'env' ? 'bg-gray-100 text-gray-500' : 'bg-brand-wash text-brand-deep'
                    }`}>
                      {a.origem === 'env' ? 'Variável de ambiente' : 'Painel'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.removivel && a.email !== currentUserEmail && (
                      <button
                        onClick={() => setConfirmRemove(a.email)}
                        disabled={removing[a.email]}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmRemove(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Remover administrador?</h3>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{confirmRemove}</strong> perderá acesso ao painel administrativo.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removing[confirmRemove]}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition">
                {removing[confirmRemove] ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminsTab;
