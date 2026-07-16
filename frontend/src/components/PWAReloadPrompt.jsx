import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker registrado:', r);
    },
    onRegisterError(error) {
      console.error('Erro no registro do Service Worker:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-canvas border border-line shadow-xl rounded-lg z-50 max-w-sm">
      <div className="mb-3 text-ink text-sm">
        {offlineReady ? (
          <span>App pronto para funcionar offline!</span>
        ) : (
          <span>Nova versão disponível. Clique no botão para atualizar.</span>
        )}
      </div>
      <div className="flex gap-2">
        {needRefresh && (
          <button className="px-4 py-2 bg-brand text-brand-contrast rounded hover:bg-brand-deep text-sm font-semibold transition" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </button>
        )}
        <button className="px-4 py-2 bg-surface text-ink rounded hover:bg-line text-sm font-semibold transition" onClick={() => close()}>
          Fechar
        </button>
      </div>
    </div>
  );
};

export default PWAReloadPrompt;