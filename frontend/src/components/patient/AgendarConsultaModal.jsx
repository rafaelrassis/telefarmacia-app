import React from 'react';
import TriagemForm from '../TriagemForm';

const AgendarConsultaModal = ({
  initialDate, onClose, onBooked, onAddCredits,
  pacienteNome, preSelectedPerson, dependentes,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
    <div
      className="relative bg-canvas border border-line rounded-2xl shadow-md w-full max-w-sm"
      style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
    >
      <TriagemForm
        tipo="agendado"
        initialDate={initialDate}
        onBack={onClose}
        onBooked={onBooked}
        onAddCredits={onAddCredits}
        pacienteNome={pacienteNome}
        preSelectedPerson={preSelectedPerson}
        dependentes={dependentes}
      />
    </div>
  </div>
);

export default AgendarConsultaModal;
