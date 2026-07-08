import React from 'react';

const SistemaFechadoBanner = ({ sistemaAberto, sistemaMotivo, sistemaProximaAbertura }) => {
  if (sistemaAberto !== false) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-amber-500 text-xl shrink-0">🕐</span>
      <div>
        <p className="text-sm font-semibold text-amber-800">Fora do horário de atendimento</p>
        <p className="text-xs text-amber-700 mt-0.5">
          {sistemaProximaAbertura
            ? `Abre ${sistemaProximaAbertura.dia} às ${sistemaProximaAbertura.hora}`
            : (sistemaMotivo || 'Tente novamente mais tarde.')}
        </p>
      </div>
    </div>
  );
};

export default SistemaFechadoBanner;
