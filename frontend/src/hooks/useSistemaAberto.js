import { useState, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useSistemaAberto() {
  const [sistemaAberto, setSistemaAberto] = useState(null);
  const [sistemaMotivo, setSistemaMotivo] = useState(null);
  const [sistemaProximaAbertura, setSistemaProximaAbertura] = useState(null);

  const fetchSistemaAberto = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/sistema/aberto`);
      const d   = res.ok ? await res.json() : null;
      if (d) {
        setSistemaAberto(d.aberto);
        setSistemaMotivo(d.motivo ?? null);
        setSistemaProximaAbertura(d.proximaAbertura ?? null);
      }
    } catch {
      setSistemaAberto(true);
      setSistemaMotivo(null);
      setSistemaProximaAbertura(null);
    }
  }, []);

  useEffect(() => { fetchSistemaAberto(); }, [fetchSistemaAberto]);

  useEffect(() => {
    const id = setInterval(fetchSistemaAberto, 60000);
    return () => clearInterval(id);
  }, [fetchSistemaAberto]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) fetchSistemaAberto(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSistemaAberto]);

  return { sistemaAberto, sistemaMotivo, sistemaProximaAbertura };
}
