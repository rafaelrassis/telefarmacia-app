import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useProximaConsulta } from '../../hooks/useProximaConsulta';
import { fmtWhen } from '../../utils/patientDashboardFormat';
import ConsultaDetalhesPaciente from '../ConsultaDetalhesPaciente';

const ProximaConsultaCard = ({ token, onCancelledExtra, onAgendar }) => {
  const { proximaConsulta, setProximaConsulta, proximaDismissId, setProximaDismissId } = useProximaConsulta(token);
  const [reminderDetalhes, setReminderDetalhes] = useState(null);

  if (!proximaConsulta || proximaDismissId === proximaConsulta.id) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-deep to-brand px-5 py-5 text-white">
        <button
          onClick={() => {
            const id = proximaConsulta.id;
            setProximaDismissId(id);
            try { sessionStorage.setItem('proximaConsultaDismissId', id); } catch {}
          }}
          aria-label="Dispensar lembrete"
          className="absolute top-3 right-3 text-white/70 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-white/80" strokeWidth={2.5} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Próxima consulta</span>
        </div>

        <p className="font-heading text-2xl font-bold leading-tight">
          {fmtWhen(proximaConsulta.dataHora)}
          {proximaConsulta.pessoaNome ? ` · ${proximaConsulta.pessoaNome.split(' ')[0]}` : ''}
        </p>
        <p className="text-sm text-white/80 mt-1">
          O farmacêutico vai te chamar pelo WhatsApp cadastrado no horário marcado.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setReminderDetalhes({ id: proximaConsulta.id, tipo: proximaConsulta.tipo, autoRemarcar: false })}
            className="flex-1 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-lg py-2 transition"
          >
            Ver detalhes
          </button>
          <button
            onClick={() => setReminderDetalhes({ id: proximaConsulta.id, tipo: proximaConsulta.tipo, autoRemarcar: true })}
            className="flex-1 bg-canvas text-brand-deep text-sm font-bold rounded-lg py-2 transition hover:opacity-90"
          >
            Remarcar
          </button>
        </div>
      </div>

      {reminderDetalhes && (
        <ConsultaDetalhesPaciente
          id={reminderDetalhes.id}
          tipo={reminderDetalhes.tipo}
          initialShowRemarcarForm={reminderDetalhes.autoRemarcar}
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
