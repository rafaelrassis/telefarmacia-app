import React from 'react';
import { fmtElapsed } from '../../utils/consultaFormat';

const ConsultaInfoHeader = ({ consulta, tipoBadge, statusCfg, elapsed, isVisualizacao, isActive }) => (
  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
    <div className="flex items-start justify-between gap-2 flex-wrap">
      <p className="font-bold text-gray-900 text-base">{consulta.pacienteNome}</p>
      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-600 shrink-0">
        {tipoBadge}
      </span>
    </div>
    <p className="text-sm text-gray-600">
      {new Date(consulta.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
    </p>

    {/* Linha de contato do paciente — só informativa, sem botão de ação (o
        botão de WhatsApp único fica no bloco "Contato preferido" abaixo). */}
    {consulta.paciente && (consulta.paciente.telefone || consulta.paciente.email) && (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#6b7280', paddingTop: '2px' }}>
        {consulta.paciente.email && (
          <span>📧 {consulta.paciente.email}</span>
        )}
        {consulta.paciente.email && consulta.paciente.telefone && (
          <span style={{ color: '#d1d5db' }}>|</span>
        )}
        {consulta.paciente.telefone && (
          <span>📞 {consulta.paciente.telefone}</span>
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
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#25D366', color: 'white',
            padding: '6px 14px', borderRadius: 8,
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}
        >
          📱 Chamar no WhatsApp ({consulta.whatsappContato || consulta.paciente.telefone})
        </a>
      ) : null
    )}

    {consulta.farmaceuticoNome && (
      <p className="text-xs text-gray-500">
        Farmacêutico(a):{' '}
        <span className="font-semibold text-gray-700">{consulta.farmaceuticoNome}</span>
      </p>
    )}

    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
        {statusCfg.label}
      </span>
      {consulta.status === 'em_atendimento' && !isVisualizacao && (
        <span className="font-mono text-sm font-bold text-green-700">
          ⏱ {fmtElapsed(elapsed)}
        </span>
      )}
    </div>

    {consulta.status === 'cancelado' && consulta.motivoCancelamento && (
      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-1">
        <p className="text-xs font-semibold text-red-600 mb-0.5">Motivo do cancelamento</p>
        <p className="text-xs text-red-700 leading-snug">{consulta.motivoCancelamento}</p>
      </div>
    )}
  </div>
);

export default ConsultaInfoHeader;
