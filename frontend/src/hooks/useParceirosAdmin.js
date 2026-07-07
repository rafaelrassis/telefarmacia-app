import { useState, useCallback, useEffect } from 'react';

// Estado + handlers da aba Parceiros ("Onde comprar").
export function useParceirosAdmin(api, showToast) {
  const [parceiros,          setParceiros]          = useState([]);
  const [parceirosLoading,   setParceirosLoading]   = useState(false);
  const [ondeComprarAtivo,   setOndeComprarAtivo]   = useState(false);
  const [togglingOC,         setTogglingOC]         = useState(false);
  const [metricasParceiros,  setMetricasParceiros]  = useState([]);
  const [parceirosForm,      setParceirosForm]      = useState(null);
  const [parceirosFormErr,   setParceirosFormErr]   = useState('');
  const [savingParceiro,     setSavingParceiro]     = useState(false);
  const [confirmDelParceiro, setConfirmDelParceiro] = useState(null);

  const loadParceiros = useCallback(async () => {
    setParceirosLoading(true);
    try {
      const [pRes, ocRes, mRes] = await Promise.all([
        api('/api/admin/parceiros'),
        api('/api/admin/config/onde-comprar'),
        api('/api/admin/parceiros/metricas'),
      ]);
      if (pRes.ok)  setParceiros(await pRes.json());
      if (ocRes.ok) { const d = await ocRes.json(); setOndeComprarAtivo(d.ativo ?? false); }
      if (mRes.ok)  { const d = await mRes.json(); setMetricasParceiros(d.parceiros ?? []); }
    } catch {}
    finally { setParceirosLoading(false); }
  }, [api]);

  useEffect(() => { loadParceiros(); }, [loadParceiros]);

  const handleToggleOC = async () => {
    setTogglingOC(true);
    try {
      const novoValor = !ondeComprarAtivo;
      const res = await api('/api/admin/config/onde-comprar', {
        method: 'PATCH', body: JSON.stringify({ ativo: novoValor }),
      });
      if (res.ok) setOndeComprarAtivo(novoValor);
      else showToast('error', 'Falha ao alterar configuração.');
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setTogglingOC(false); }
  };

  const handleSaveParceiro = async () => {
    setParceirosFormErr('');
    if (!parceirosForm?.nome?.trim())          { setParceirosFormErr('Nome é obrigatório.'); return; }
    if (!parceirosForm?.baseUrl?.trim())       { setParceirosFormErr('URL base é obrigatória.'); return; }
    if (!parceirosForm?.affiliateCode?.trim()) { setParceirosFormErr('Código de afiliado é obrigatório.'); return; }
    setSavingParceiro(true);
    try {
      const isEdit = Boolean(parceirosForm.id);
      const res = await api(
        isEdit ? `/api/admin/parceiros/${parceirosForm.id}` : '/api/admin/parceiros',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(parceirosForm) }
      );
      if (res.ok) {
        setParceirosForm(null);
        loadParceiros();
      } else {
        const d = await res.json().catch(() => ({}));
        setParceirosFormErr(d.error || 'Erro ao salvar.');
      }
    } catch { setParceirosFormErr('Falha de conexão.'); }
    finally  { setSavingParceiro(false); }
  };

  const handleDeleteParceiro = async (id) => {
    try {
      const res = await api(`/api/admin/parceiros/${id}`, { method: 'DELETE' });
      if (res.ok) { setConfirmDelParceiro(null); loadParceiros(); }
      else showToast('error', 'Falha ao excluir parceiro.');
    } catch { showToast('error', 'Falha de conexão.'); }
  };

  return {
    parceiros, parceirosLoading, ondeComprarAtivo, togglingOC, metricasParceiros,
    parceirosForm, setParceirosForm, parceirosFormErr, setParceirosFormErr, savingParceiro,
    confirmDelParceiro, setConfirmDelParceiro,
    handleToggleOC, handleSaveParceiro, handleDeleteParceiro,
  };
}
