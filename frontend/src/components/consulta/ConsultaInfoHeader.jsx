import React from 'react';
import { Mail, Phone, MessageCircle, Clock } from 'lucide-react';
import { fmtElapsed } from '../../utils/consultaFormat';

const ConsultaInfoHeader = ({ consulta, tipoBadge, statusCfg, elapsed, isVisualizacao, isActive }) => (
  <div className="bg-surface rounded-xl p-4 space-y-2">
    <div className="flex items-start justify-between gap-2 flex-wrap">
      <p className="font-bold text-ink text-base">{consulta.pacienteNome}</p>
      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-line text-muted shrink-0">
        {tipoBadge}
      </span>
    </div>
    <p className="text-sm text-muted">
      {new Date(consulta.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
    </p>

    {/* Linha de contato do paciente — só informativa, sem botão de ação (o
        botão de WhatsApp único fica no bloco "Contato preferido" abaixo). */}
    {consulta.paciente && (consulta.paciente.telefone || consulta.paciente.email) && (
      <div className="flex items-center flex-wrap gap-2 text-xs text-muted pt-0.5">
        {consulta.paciente.email && (
          <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{consulta.paciente.email}</span>
        )}
        {consulta.paciente.email && consulta.paciente.telefone && (
          <span className="text-line">|</span>
        )}
        {consulta.paciente.telefone && (
          <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{consulta.paciente.telefone}</span>
        )}
      </div>
    )}

    {/* Contato preferido para esta consulta — um único botão de WhatsApp:
        usa o número indicado na triagem (whatsappContato) quando existir,
        senão cai para o telefone de cadastro do paciente. */}
    {isActive && !isVisualizacao && (
      (consulta.whatsappContato || consulta.paciente?.telefone) ? (
        <a
          href={`https://wa.me/55${(consulta.whatsappContato || consulta.paciente.telefone).replace(/\D/g, '')}`}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-3.5 py-1.5 rounded-lg text-[13px] font-bold no-underline"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Chamar no WhatsApp ({consulta.whatsappContato || consulta.paciente.telefone})
        </a>
      ) : null
    )}

    {consulta.farmaceuticoNome && (
      <p className="text-xs text-muted">
        Farmacêutico(a):{' '}
        <span className="font-semibold text-ink">{consulta.farmaceuticoNome}</span>
      </p>
    )}

    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
        {statusCfg.label}
      </span>
      {consulta.status === 'em_atendimento' && !isVisualizacao && (
        <span className="font-mono text-sm font-bold text-success inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {fmtElapsed(elapsed)}
        </span>
      )}
    </div>

    {consulta.status === 'cancelado' && consulta.motivoCancelamento && (
      <div className="bg-error-wash border border-error/30 rounded-lg px-3 py-2 mt-1">
        <p className="text-xs font-semibold text-error mb-0.5">Motivo do cancelamento</p>
        <p className="text-xs text-error leading-snug">{consulta.motivoCancelamento}</p>
      </div>
    )}
  </div>
);

export default ConsultaInfoHeader;
