import React from 'react';
import { ClipboardList, AlertTriangle } from 'lucide-react';

const EncaminhamentoSection = ({
  consulta, isAssigned, isVisualizacao,
  encaminhamentoPdfUrl, handleAbrirDocumento,
}) => (
  <>
    {/* ── Encaminhamento ── */}
    {consulta?.status === 'concluido' && consulta?.finalizacao?.encaminhamento_medico === 'sim' && isAssigned && !isVisualizacao && (
      <div className="border-t border-line pt-4">
        <p className="text-sm font-semibold text-ink mb-2">Documento de Encaminhamento</p>
        {encaminhamentoPdfUrl ? (
          <button
            onClick={() => handleAbrirDocumento(encaminhamentoPdfUrl)}
            className="w-full px-4 py-2.5 text-center text-sm font-bold text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-50 transition inline-flex items-center justify-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4" />
            Ver encaminhamento
          </button>
        ) : (
          <p className="text-xs text-alert bg-alert-wash border border-alert/30 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Documento de encaminhamento sendo gerado automaticamente. Atualize a página em instantes.
          </p>
        )}
      </div>
    )}

    {/* Visualizar encaminhamento (modo visualização / paciente) */}
    {isVisualizacao && encaminhamentoPdfUrl && (
      <div className="border-t border-line pt-4">
        <button
          onClick={() => handleAbrirDocumento(encaminhamentoPdfUrl)}
          className="flex items-center gap-2 text-sm font-bold text-teal-700 border border-teal-200 rounded-xl px-4 py-2.5 hover:bg-teal-50 transition w-full justify-center"
        >
          <ClipboardList className="w-4 h-4" />
          Ver documento de encaminhamento
        </button>
      </div>
    )}
  </>
);

export default EncaminhamentoSection;
