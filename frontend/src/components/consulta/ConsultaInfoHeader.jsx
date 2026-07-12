import React from 'react';
import { Mail, Phone, MessageCircle, Clock, Zap, CalendarClock, Users, X } from 'lucide-react';
import { formatIdade } from '../../utils/formatIdade.js';
import { fmtElapsed } from '../../utils/consultaFormat';

const ConsultaInfoHeader = ({ consulta, tipo, triagem, statusCfg, elapsed, isVisualizacao, isActive, onClose }) => {
  const TipoIcon = tipo === 'urgente' ? Zap : CalendarClock;
  const idadeStr = triagem?.paciente_data_nascimento
    ? formatIdade(triagem.paciente_data_nascimento)
    : triagem?.paciente_idade != null ? `${triagem.paciente_idade} anos` : null;
  const isDependente = Boolean(triagem?.dependent_id);

  return (
    <div className="px-4 sm:px-6 py-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-ink text-base truncate">{consulta.pacienteNome}</p>
            {idadeStr && <span className="text-sm text-muted shrink-0">· {idadeStr}</span>}
            {isDependente && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-brand-wash text-brand-deep px-1.5 py-0.5 rounded-full shrink-0">
                <Users className="w-3 h-3" />
                Dependente
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-line text-muted">
              <TipoIcon className="w-3 h-3" />
              {tipo === 'urgente' ? 'Urgente' : 'Agendada'}
            </span>
            <span className="text-xs text-muted">
              {new Date(consulta.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
            {consulta.status === 'em_atendimento' && !isVisualizacao && (
              <span className="font-mono text-xs font-bold text-success inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {fmtElapsed(elapsed)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Contato preferido — um único botão de WhatsApp: usa o número
              indicado na triagem (whatsappContato) quando existir, senão
              cai para o telefone de cadastro do paciente. */}
          {isActive && !isVisualizacao && (consulta.whatsappContato || consulta.paciente?.telefone) && (
            <a
              href={`https://wa.me/55${(consulta.whatsappContato || consulta.paciente.telefone).replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-3.5 py-1.5 rounded-lg text-[13px] font-bold no-underline whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="text-muted hover:text-ink w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface transition shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Linha de contato do paciente — só informativa (o botão de ação
          principal fica acima); dependente ou telefone alternativo. */}
      {consulta.paciente && (consulta.paciente.telefone || consulta.paciente.email) && (
        <div className="flex items-center flex-wrap gap-2 text-xs text-muted">
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

      {consulta.farmaceuticoNome && (
        <p className="text-xs text-muted">
          Farmacêutico(a):{' '}
          <span className="font-semibold text-ink">{consulta.farmaceuticoNome}</span>
        </p>
      )}

      {consulta.status === 'cancelado' && consulta.motivoCancelamento && (
        <div className="bg-error-wash border border-error/30 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-error mb-0.5">Motivo do cancelamento</p>
          <p className="text-xs text-error leading-snug">{consulta.motivoCancelamento}</p>
        </div>
      )}
    </div>
  );
};

export default ConsultaInfoHeader;
