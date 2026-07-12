import React from 'react';
import { RotateCw } from 'lucide-react';

const RetornoSugeridoForm = ({ retornoDias, setRetornoDias, retornoObs, setRetornoObs }) => (
  <div className="border border-success/30 rounded-xl overflow-hidden">
    <div className="px-3.5 py-2.5 bg-success-wash border-b border-success/30">
      <span className="text-[13px] font-bold text-success inline-flex items-center gap-1.5">
        <RotateCw className="w-3.5 h-3.5" />
        Sugerir retorno{' '}
        <span className="font-normal text-muted text-xs">(opcional)</span>
      </span>
    </div>
    <div className="px-3.5 py-3 bg-canvas flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <label htmlFor="retorno-dias" className="text-[13px] text-ink shrink-0">Retorno em</label>
        <input
          id="retorno-dias"
          type="number" min="1" max="365"
          value={retornoDias}
          onChange={(e) => setRetornoDias(e.target.value)}
          placeholder="ex: 30"
          className="w-20 border border-line rounded-lg px-2.5 py-1.5 text-sm outline-none font-inherit bg-surface"
        />
        <span className="text-[13px] text-muted">dias</span>
      </div>
      {retornoDias && (
        <textarea
          value={retornoObs}
          onChange={(e) => setRetornoObs(e.target.value)}
          placeholder="Observação para o retorno (opcional)"
          rows={2}
          className="w-full box-border border border-line rounded-lg px-2.5 py-2 text-[13px] resize-none font-inherit outline-none bg-surface"
        />
      )}
    </div>
  </div>
);

export default RetornoSugeridoForm;
