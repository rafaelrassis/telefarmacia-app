import React, { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Badge de "consultas incluídas restantes" quando o paciente tem assinatura
// ativa — some silenciosamente quando não há assinatura.
const AssinaturaBadge = () => {
  const { token } = useAuth();
  const [assinatura, setAssinatura] = useState(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`${API_URL}/api/assinaturas/minha`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelado && d?.ativa) setAssinatura(d); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [token]);

  if (!assinatura || !['ativa', 'trial'].includes(assinatura.status)) return null;

  return (
    <div className="inline-flex items-center gap-1.5 bg-brand-wash border border-brand/20 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-deep w-fit">
      <CalendarCheck className="w-3.5 h-3.5" />
      {assinatura.consultasRestantes} consulta{assinatura.consultasRestantes !== 1 ? 's' : ''} incluída{assinatura.consultasRestantes !== 1 ? 's' : ''} restante{assinatura.consultasRestantes !== 1 ? 's' : ''} neste ciclo
    </div>
  );
};

export default AssinaturaBadge;
