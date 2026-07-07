import { useState, useCallback, useEffect } from 'react';

// Estado + handlers da aba Convites (convidar farmacêutico por e-mail).
export function useConvitesAdmin(api, showToast) {
  const [convites,        setConvites]        = useState([]);
  const [convitesLoading, setConvitesLoading] = useState(false);
  const [conviteForm,     setConviteForm]     = useState(null); // null | {}
  const [conviteNome,     setConviteNome]     = useState('');
  const [conviteEmail,    setConviteEmail]    = useState('');
  const [conviteErr,      setConviteErr]      = useState('');
  const [savingConvite,   setSavingConvite]   = useState(false);
  const [conviteLink,     setConviteLink]     = useState(null);

  const loadConvites = useCallback(async () => {
    setConvitesLoading(true);
    try {
      const res = await api('/api/admin/convites');
      if (res.ok) setConvites(await res.json());
    } catch {}
    finally { setConvitesLoading(false); }
  }, [api]);

  useEffect(() => { loadConvites(); }, [loadConvites]);

  const handleCriarConvite = async (e) => {
    e.preventDefault();
    if (!conviteNome.trim() || !conviteEmail.trim()) { setConviteErr('Nome e e-mail são obrigatórios.'); return; }
    setSavingConvite(true);
    setConviteErr('');
    try {
      const res = await api('/api/admin/convites', {
        method: 'POST',
        body: JSON.stringify({ nome: conviteNome.trim(), email: conviteEmail.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setConviteLink(d.link);
        setConvites((prev) => [d.convite, ...prev]);
        setConviteNome('');
        setConviteEmail('');
      } else {
        setConviteErr(d.error || 'Erro ao criar convite.');
      }
    } catch { setConviteErr('Falha de conexão.'); }
    finally { setSavingConvite(false); }
  };

  const handleRevogarConvite = async (id) => {
    try {
      const res = await api(`/api/admin/convites/${id}`, { method: 'DELETE' });
      if (res.ok) setConvites((prev) => prev.filter((c) => c.id !== id));
      else { const d = await res.json(); showToast('error', d.error || 'Erro ao revogar.'); }
    } catch { showToast('error', 'Falha de conexão.'); }
  };

  return {
    convites, convitesLoading, conviteForm, setConviteForm,
    conviteNome, setConviteNome, conviteEmail, setConviteEmail,
    conviteErr, setConviteErr, savingConvite, conviteLink, setConviteLink,
    handleCriarConvite, handleRevogarConvite,
  };
}
