import { useState, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useProximaConsulta(token) {
  const [proximaConsulta, setProximaConsulta] = useState(null);
  const [proximaDismissId, setProximaDismissId] = useState(() => {
    try { return sessionStorage.getItem('proximaConsultaDismissId') || null; } catch { return null; }
  });

  const fetchProximaConsulta = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/paciente/proxima-consulta`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProximaConsulta(data);
      // Re-exibir lembrete dispensado se faltar menos de 2h
      if (data && proximaDismissId === data.id) {
        const diffMs = new Date(data.dataHora).getTime() - Date.now();
        if (diffMs > 0 && diffMs < 2 * 60 * 60 * 1000) {
          setProximaDismissId(null);
          try { sessionStorage.removeItem('proximaConsultaDismissId'); } catch {}
        }
      }
    } catch {}
  }, [token, proximaDismissId]);

  useEffect(() => { fetchProximaConsulta(); }, [fetchProximaConsulta]);

  useEffect(() => {
    const id = setInterval(fetchProximaConsulta, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchProximaConsulta]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) fetchProximaConsulta(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchProximaConsulta]);

  return { proximaConsulta, setProximaConsulta, proximaDismissId, setProximaDismissId };
}
