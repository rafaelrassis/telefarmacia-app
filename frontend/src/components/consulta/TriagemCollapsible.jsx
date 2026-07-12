import React from 'react';
import { ChevronUp, ChevronDown, Paperclip } from 'lucide-react';
import TriagemDisplay from './TriagemDisplay';

const TriagemCollapsible = ({ triagem, pacienteNome, showTriagem, setShowTriagem, anexoReceitaUrl, onAbrirAnexo }) => {
  if (!triagem) return null;

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setShowTriagem((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-surface border-0 cursor-pointer text-[13px] font-bold text-ink"
      >
        <span>Triagem do paciente</span>
        <span className="text-[11px] text-muted inline-flex items-center gap-1">
          {showTriagem ? (<><ChevronUp className="w-3.5 h-3.5" />Fechar</>) : (<><ChevronDown className="w-3.5 h-3.5" />Ver</>)}
        </span>
      </button>
      {showTriagem && (
        <div className="px-3.5 py-3 bg-canvas text-[13px] text-ink">
          <TriagemDisplay triagem={triagem} solicitanteNome={pacienteNome} />
          {anexoReceitaUrl && (
            <button
              type="button"
              onClick={() => onAbrirAnexo?.(anexoReceitaUrl)}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/30 bg-brand-wash text-brand-deep text-xs font-bold cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Ver anexo da receita
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TriagemCollapsible;
