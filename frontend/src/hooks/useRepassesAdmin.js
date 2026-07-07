import { useState, useCallback, useEffect } from 'react';

// Estado + handlers da aba Repasses.
export function useRepassesAdmin(api, showToast) {
  const [repasseFarmId,       setRepasseFarmId]       = useState('');
  const [repasseDe,           setRepasseDe]           = useState('');
  const [repasseAte,          setRepasseAte]          = useState('');
  const [repassePreview,      setRepassePreview]       = useState(null);
  const [repassePreviewErr,   setRepassePreviewErr]   = useState('');
  const [repasseLoading,      setRepasseLoading]      = useState(false);
  const [repasseRef,          setRepasseRef]          = useState('');
  const [repasseConfirming,   setRepasseConfirming]   = useState(false);
  const [repasseHistorico,    setRepasseHistorico]    = useState([]);
  const [repasseHistLoading,  setRepasseHistLoading]  = useState(false);
  const [repasseExportLoading, setRepasseExportLoading] = useState(false);
  const [repasseExpanded,     setRepasseExpanded]     = useState({});

  const loadRepasseHistorico = useCallback(async (farmId) => {
    setRepasseHistLoading(true);
    try {
      const params = new URLSearchParams();
      if (farmId) params.set('pharmacistId', farmId);
      const res = await api(`/api/admin/repasses?${params}`);
      if (res.ok) setRepasseHistorico((await res.json()).items ?? []);
    } catch {}
    finally { setRepasseHistLoading(false); }
  }, [api]);

  useEffect(() => {
    loadRepasseHistorico(repasseFarmId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreviewRepasse = async () => {
    if (!repasseFarmId || !repasseDe || !repasseAte) {
      setRepassePreviewErr('Selecione farmacêutico e período.');
      return;
    }
    setRepasseLoading(true);
    setRepassePreviewErr('');
    setRepassePreview(null);
    try {
      const params = new URLSearchParams({ pharmacistId: repasseFarmId, de: repasseDe, ate: repasseAte });
      const res = await api(`/api/admin/repasses/preview?${params}`);
      const d   = await res.json();
      if (res.ok) { setRepassePreview(d); setRepasseRef(''); }
      else setRepassePreviewErr(d.error || 'Erro ao carregar prévia.');
    } catch { setRepassePreviewErr('Falha de conexão.'); }
    finally { setRepasseLoading(false); }
  };

  const handleConfirmarRepasse = async () => {
    if (!repassePreview) return;
    setRepasseConfirming(true);
    try {
      const res  = await api('/api/admin/repasses', {
        method: 'POST',
        body: JSON.stringify({ pharmacistId: repasseFarmId, de: repasseDe, ate: repasseAte, referenciaTransacao: repasseRef }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast('success', `Repasse de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.valorTotal)} registrado.`);
        setRepassePreview(null);
        loadRepasseHistorico(repasseFarmId);
      } else {
        showToast('error', d.error || 'Erro ao registrar repasse.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setRepasseConfirming(false); }
  };

  return {
    repasseFarmId, setRepasseFarmId, repasseDe, setRepasseDe, repasseAte, setRepasseAte,
    repassePreview, setRepassePreview, repassePreviewErr, repasseLoading,
    repasseRef, setRepasseRef, repasseConfirming,
    repasseHistorico, repasseHistLoading, repasseExportLoading, setRepasseExportLoading,
    repasseExpanded, setRepasseExpanded,
    loadRepasseHistorico, handlePreviewRepasse, handleConfirmarRepasse,
  };
}
