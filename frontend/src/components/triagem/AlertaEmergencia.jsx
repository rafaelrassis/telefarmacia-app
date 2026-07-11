import React from 'react';
import { Siren } from 'lucide-react';

// Bloqueio total (overlay) quando algum sinal de alerta é marcado — não é um
// aviso inline: cobre a ficha inteira e força o encerramento da triagem.
const AlertaEmergencia = ({ onFechar }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-error/97 px-6 py-8 text-center">
    <Siren className="w-12 h-12 text-white mb-4" strokeWidth={2} />
    <h3 className="text-white font-heading font-extrabold text-lg mb-3">
      Procure atendimento presencial imediatamente
    </h3>
    <p className="text-white/85 text-sm leading-relaxed mb-2">
      Os sintomas informados indicam uma situação que{' '}
      <strong className="text-white">não pode ser tratada por teleconsulta</strong>.
    </p>
    <p className="text-white/85 text-sm leading-relaxed mb-7">
      Ligue imediatamente para o{' '}
      <strong className="text-white text-[17px]">SAMU (192)</strong>{' '}
      ou vá ao pronto-socorro mais próximo.
    </p>
    <button
      type="button"
      onClick={onFechar}
      className="w-full max-w-[280px] py-3 rounded-lg bg-white text-error font-bold text-sm"
    >
      Fechar e cancelar
    </button>
  </div>
);

export default AlertaEmergencia;
