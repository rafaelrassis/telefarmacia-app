import React from 'react';

const PassarAgoraResultPanel = ({
  passarAgoraMsg, filaInfo, handleCancelarUrgente, onAgendarHorario, onOpenWalletTopup,
  onDismiss,
}) => {
  if (!passarAgoraMsg) return null;

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: passarAgoraMsg.type === 'success'          ? '#f0fdf4'
                : passarAgoraMsg.type === 'waiting'           ? '#eff6ff'
                : passarAgoraMsg.type === 'nenhum_disponivel' ? '#fff7ed'
                : '#fef2f2',
      border: `1px solid ${
        passarAgoraMsg.type === 'success'          ? '#86efac'
        : passarAgoraMsg.type === 'waiting'        ? '#bfdbfe'
        : passarAgoraMsg.type === 'nenhum_disponivel' ? '#fed7aa'
        : '#fca5a5'
      }`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <div style={{ flex: 1 }}>
        {passarAgoraMsg.type === 'waiting' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              border: '2px solid #2563eb', borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
            <p style={{ fontSize: '14px', color: '#1d4ed8', margin: 0, flex: 1 }}>
              Aguardando farmacêutico... (verificando a cada 5s)
            </p>
            <button
              onClick={handleCancelarUrgente}
              style={{
                fontSize: '13px', color: '#6b7280', background: 'white',
                border: '1px solid #d1d5db', borderRadius: '6px',
                padding: '4px 12px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Cancelar
            </button>
          </div>
        )}
        {passarAgoraMsg.type === 'waiting' && filaInfo && (
          <p style={{ fontSize: '12px', color: '#1d4ed8', margin: '6px 0 0' }}>
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
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#15803d', margin: '0 0 4px 0' }}>
              ✓ Farmacêutico aceitou!
            </p>
            <p style={{ fontSize: '13px', color: '#166534', margin: '0 0 8px 0' }}>
              {passarAgoraMsg.farmaceutico} está pronto para seu atendimento.
            </p>
            {passarAgoraMsg.modalidadeAtend === 'meet' ? (
              <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
                📹 Atendimento via <strong>Google Meet</strong> — aguarde o link no chat ou e-mail.
              </p>
            ) : passarAgoraMsg.whatsappContato ? (
              <a
                href={`https://wa.me/55${passarAgoraMsg.whatsappContato.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: '13px', fontWeight: 700, color: '#fff',
                  background: '#16a34a', borderRadius: 8,
                  padding: '6px 14px', textDecoration: 'none',
                }}
              >
                📱 Abrir WhatsApp
              </a>
            ) : null}
          </>
        )}
        {passarAgoraMsg.type === 'nenhum_disponivel' && (
          <div>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#b91c1c', margin: '0 0 6px 0' }}>
              Nenhum profissional disponível no momento
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px 0' }}>
              Todos os farmacêuticos estão ocupados ou offline. Tente mais tarde ou agende um horário.
            </p>
            <button
              onClick={onAgendarHorario}
              style={{
                fontSize: '13px', fontWeight: 700, color: '#fff',
                background: '#2563eb', border: 'none', borderRadius: '6px',
                padding: '6px 14px', cursor: 'pointer',
              }}
            >
              📅 Agendar horário
            </button>
          </div>
        )}
        {(passarAgoraMsg.type === 'unavailable' || passarAgoraMsg.type === 'error') && (
          <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>
            {passarAgoraMsg.mensagem}
          </p>
        )}
        {passarAgoraMsg.type === 'credits' && (
          <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>
            {passarAgoraMsg.error}{' '}
            <button
              onClick={onOpenWalletTopup}
              style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              Adicionar créditos
            </button>
          </p>
        )}
      </div>
      {passarAgoraMsg.type !== 'waiting' && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '20px', lineHeight: 1, padding: 0, flexShrink: 0 }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default PassarAgoraResultPanel;
