import React, { useState, useCallback, useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { toLocalDateStr } from '../../utils/patientDashboardFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const RetornoSugeridoCard = ({ token, onAgendar, onVisibleChange }) => {
  const [retornoSugerido, setRetornoSugerido] = useState(null);
  const [dispensandoRetorno, setDispensandoRetorno] = useState(false);
  const [agendandoRetorno, setAgendandoRetorno] = useState(false);

  const fetchRetornoSugerido = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/paciente/retorno-sugerido`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRetornoSugerido(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { fetchRetornoSugerido(); }, [fetchRetornoSugerido]);

  useEffect(() => { onVisibleChange?.(Boolean(retornoSugerido)); }, [retornoSugerido, onVisibleChange]);

  const handleDispensarRetorno = async () => {
    if (!retornoSugerido) return;
    setDispensandoRetorno(true);
    try {
      const res = await fetch(`${API_URL}/api/consulta/${retornoSugerido.consultaId}/dispensar-retorno`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: retornoSugerido.tipo }),
      });
      if (res.ok) setRetornoSugerido(null);
    } catch {}
    finally { setDispensandoRetorno(false); }
  };

  // "Agendar retorno": pré-preenche a data (hoje + dias_sugeridos, ajustada para o
  // próximo dia com sistema aberto e horários disponíveis) e abre o fluxo normal de
  // agendamento. Ao concluir, dispensa o retorno sugerido automaticamente.
  const handleAgendarRetorno = async () => {
    if (!retornoSugerido) return;
    const retorno = retornoSugerido;
    setAgendandoRetorno(true);
    try {
      const diasSugeridos = retorno.retornoSugerido?.dias_sugeridos ?? 1;
      let candidate = new Date(Date.now() + diasSugeridos * 86400000);
      let foundDate = null;
      for (let i = 0; i < 30; i++) {
        const dataStr = toLocalDateStr(candidate);
        try {
          const res = await fetch(`${API_URL}/api/disponibilidade?data=${dataStr}`);
          if (res.ok) {
            const d = await res.json();
            if (Array.isArray(d.slots) && d.slots.length > 0) { foundDate = dataStr; break; }
          }
        } catch {}
        candidate = new Date(candidate.getTime() + 86400000);
      }
      setRetornoSugerido(null);
      onAgendar?.({
        consultaId: retorno.consultaId,
        tipo: retorno.tipo,
        initialDate: foundDate || toLocalDateStr(new Date(Date.now() + diasSugeridos * 86400000)),
      });
    } finally {
      setAgendandoRetorno(false);
    }
  };

  if (!retornoSugerido) return null;

  const rs = retornoSugerido.retornoSugerido;
  const diasSugeridos = rs?.dias_sugeridos;
  const observacao = rs?.observacao;
  const dataEstimada = diasSugeridos
    ? new Date(Date.now() + diasSugeridos * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null;

  return (
    <div className="shrink-0 w-[230px] rounded-2xl border border-line bg-canvas p-4 flex flex-col gap-2 relative">
      <button
        onClick={handleDispensarRetorno}
        disabled={dispensandoRetorno}
        aria-label="Dispensar sugestão"
        className="absolute top-3 right-3 text-muted hover:text-ink transition disabled:opacity-50"
      >
        <X className="w-4 h-4" />
      </button>
      <span className="w-8 h-8 rounded-full bg-success-wash flex items-center justify-center text-success shrink-0">
        <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
      </span>
      <p className="font-heading text-sm font-bold text-ink">
        Retorno sugerido{dataEstimada ? ` para ~${dataEstimada}` : ''}
      </p>
      <p className="text-xs text-muted leading-snug flex-1">
        {observacao
          ? `"${observacao}"`
          : retornoSugerido.farmaceuticoNome
            ? `Por ${retornoSugerido.farmaceuticoNome.split(' ')[0]}${diasSugeridos ? ` · em ${diasSugeridos} dias` : ''}`
            : 'Sugerido pelo farmacêutico'}
      </p>
      <button
        onClick={handleAgendarRetorno}
        disabled={agendandoRetorno}
        className="bg-success hover:opacity-90 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
      >
        {agendandoRetorno ? 'Verificando...' : 'Agendar retorno'}
      </button>
    </div>
  );
};

export default RetornoSugeridoCard;
