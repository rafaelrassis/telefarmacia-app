import React from 'react';
import { CheckCircle2, CalendarClock, MessageCircle, X } from 'lucide-react';

const PANEL_CLS = {
  success:          'bg-success-wash border-success/30',
  waiting:          'bg-brand-wash border-brand/30',
  nenhum_disponivel: 'bg-alert-wash border-alert/30',
};

const PassarAgoraResultPanel = ({
  passarAgoraMsg, filaInfo, handleCancelarUrgente, onAgendarHorario, onOpenWalletTopup,
  onDismiss,
}) => {
  if (!passarAgoraMsg) return null;

  const panelCls = PANEL_CLS[passarAgoraMsg.type] ?? 'bg-error-wash border-error/30';

  return (
    <div className={`px-4 py-3 rounded-lg border flex justify-between items-start gap-3 ${panelCls}`}>
      <div className="flex-1">
        {passarAgoraMsg.type === 'waiting' && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin shrink-0" />
            <p className="text-sm text-brand-deep m-0 flex-1">
              Aguardando farmacêutico... (verificando a cada 5s)
            </p>
            <button
              onClick={handleCancelarUrgente}
              className="text-[13px] text-muted bg-canvas border border-line rounded-md px-3 py-1 shrink-0"
            >
              Cancelar
            </button>
          </div>
        )}
        {passarAgoraMsg.type === 'waiting' && filaInfo && (
          <p className="text-xs text-brand-deep mt-1.5 mb-0">
            {filaInfo.farmaceuticosOnline > 0 ? (
              <>
                Você é o <strong>{filaInfo.posicao}º</strong> da fila
                {filaInfo.tempoMedioAceiteMin != null && (
                  <> · tempo médio de aceite ~<strong>{filaInfo.tempoMedioAceiteMin} min</strong></>
                )}
                {' '}· <strong>{filaInfo.farmaceuticosOnline}</strong> farmacêutico{filaInfo.farmaceuticosOnline !== 1 ? 's' : ''} online
              </>
            ) : (
              'Nenhum farmacêutico online agora — você será notificado assim que alguém aceitar.'
            )}
          </p>
        )}
        {passarAgoraMsg.type === 'success' && (
          <>
            <p className="text-sm font-bold text-success mb-1 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Farmacêutico aceitou!
            </p>
            <p className="text-[13px] text-success mb-2">
              {passarAgoraMsg.farmaceutico} está pronto para seu atendimento.
            </p>
            {passarAgoraMsg.whatsappContato ? (
              <a
                href={`https://wa.me/55${passarAgoraMsg.whatsappContato.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-[#25D366] rounded-lg px-3.5 py-1.5 no-underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Abrir WhatsApp
              </a>
            ) : null}
          </>
        )}
        {passarAgoraMsg.type === 'nenhum_disponivel' && (
          <div>
            <p className="text-sm font-bold text-alert mb-1.5">
              Nenhum profissional disponível no momento
            </p>
            <p className="text-[13px] text-muted mb-2">
              Todos os farmacêuticos estão ocupados ou offline. Tente mais tarde ou agende um horário.
            </p>
            <button
              onClick={onAgendarHorario}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-brand hover:bg-brand-deep rounded-md px-3.5 py-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Agendar horário
            </button>
          </div>
        )}
        {(passarAgoraMsg.type === 'unavailable' || passarAgoraMsg.type === 'error') && (
          <p className="text-sm text-error m-0">
            {passarAgoraMsg.mensagem}
          </p>
        )}
        {passarAgoraMsg.type === 'credits' && (
          <p className="text-sm text-error m-0">
            {passarAgoraMsg.error}{' '}
            <button
              onClick={onOpenWalletTopup}
              className="text-brand-deep underline bg-transparent border-none cursor-pointer text-[13px]"
            >
              Adicionar créditos
            </button>
          </p>
        )}
      </div>
      {passarAgoraMsg.type !== 'waiting' && (
        <button
          onClick={onDismiss}
          aria-label="Fechar"
          className="bg-transparent border-none cursor-pointer text-muted p-0 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default PassarAgoraResultPanel;
