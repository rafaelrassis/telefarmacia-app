import React, { useState, useCallback, useEffect } from 'react';
import { toLocalDateStr } from '../../utils/patientDashboardFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const RetornoSugeridoCard = ({ token, onAgendar }) => {
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
    <div style={{
      background: '#f0fdf4', border: '1.5px solid #86efac',
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803d' }}>
            🔄 Retorno sugerido{dataEstimada ? ` para ~${dataEstimada}` : ''}
          </p>
          {retornoSugerido.farmaceuticoNome && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#16a34a' }}>
              Por {retornoSugerido.farmaceuticoNome.split(' ')[0]}
              {diasSugeridos ? ` · em ${diasSugeridos} dias` : ''}
            </p>
          )}
        </div>
        <button
          onClick={handleDispensarRetorno}
          disabled={dispensandoRetorno}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86efac', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}
          aria-label="Dispensar sugestão"
        >
          ×
        </button>
      </div>
      {observacao && (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#166534', fontStyle: 'italic' }}>
          "{observacao}"
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleAgendarRetorno}
          disabled={agendandoRetorno}
          style={{
            flex: 2, padding: '8px 0', background: '#16a34a', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: agendandoRetorno ? 'wait' : 'pointer', opacity: agendandoRetorno ? 0.7 : 1,
          }}
        >
          {agendandoRetorno ? 'Verificando horários...' : 'Agendar retorno'}
        </button>
        <button
          onClick={handleDispensarRetorno}
          disabled={dispensandoRetorno}
          style={{
            flex: 1, padding: '8px 0', background: 'white', color: '#16a34a',
            border: '1px solid #86efac', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            opacity: dispensandoRetorno ? 0.6 : 1,
          }}
        >
          {dispensandoRetorno ? '...' : 'Dispensar'}
        </button>
      </div>
    </div>
  );
};

export default RetornoSugeridoCard;
