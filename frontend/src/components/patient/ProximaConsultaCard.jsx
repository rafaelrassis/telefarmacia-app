import React, { useState } from 'react';
import { useProximaConsulta } from '../../hooks/useProximaConsulta';
import { fmtWhen } from '../../utils/patientDashboardFormat';
import ConsultaDetalhesPaciente from '../ConsultaDetalhesPaciente';

const ProximaConsultaCard = ({ token, onCancelledExtra, onAgendar }) => {
  const { proximaConsulta, setProximaConsulta, proximaDismissId, setProximaDismissId } = useProximaConsulta(token);
  const [reminderDetalhes, setReminderDetalhes] = useState(null);

  return (
    <>
      {proximaConsulta && proximaDismissId !== proximaConsulta.id && (
        <div style={{
          background: '#eff6ff', border: '1.5px solid #93c5fd',
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.2 }}>🔔</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e40af' }}>
              Você tem consulta {fmtWhen(proximaConsulta.dataHora)}
              {proximaConsulta.pessoaNome ? ` para ${proximaConsulta.pessoaNome.split(' ')[0]}` : ''}
            </p>
            <button
              onClick={() => setReminderDetalhes({ id: proximaConsulta.id, tipo: proximaConsulta.tipo })}
              style={{
                marginTop: 4, background: 'none', border: 'none',
                padding: 0, fontSize: 12, color: '#2563eb',
                cursor: 'pointer', fontWeight: 600, textDecoration: 'underline',
              }}
            >
              Ver detalhes →
            </button>
          </div>
          <button
            onClick={() => {
              const id = proximaConsulta.id;
              setProximaDismissId(id);
              try { sessionStorage.setItem('proximaConsultaDismissId', id); } catch {}
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#93c5fd', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0,
            }}
            aria-label="Dispensar lembrete"
          >
            ×
          </button>
        </div>
      )}

      {reminderDetalhes && (
        <ConsultaDetalhesPaciente
          id={reminderDetalhes.id}
          tipo={reminderDetalhes.tipo}
          onClose={() => setReminderDetalhes(null)}
          onCancelled={() => {
            setReminderDetalhes(null);
            setProximaConsulta(null);
            onCancelledExtra?.();
          }}
          onAgendar={() => {
            setReminderDetalhes(null);
            onAgendar?.();
          }}
        />
      )}
    </>
  );
};

export default ProximaConsultaCard;
