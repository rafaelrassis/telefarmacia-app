import React, { useState, useEffect } from 'react';

const IOS_DISMISSED_KEY = 'fc_ios_install_dismissed';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(
    isIOS && !isStandalone && sessionStorage.getItem(IOS_DISMISSED_KEY) !== 'true'
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismissIOSPrompt = () => {
    sessionStorage.setItem(IOS_DISMISSED_KEY, 'true');
    setShowIOSPrompt(false);
  };

  if (isStandalone) return null;

  if (showIOSPrompt) {
    return (
      <div className="bg-brand text-white p-3 flex justify-between items-center fixed top-0 left-0 w-full z-50 shadow-md">
        <span className="text-sm font-semibold">
          Instale o FarmaConsulta: toque em Compartilhar (ícone de quadrado com seta) e depois em
          &quot;Adicionar à Tela de Início&quot;.
        </span>
        <button
          onClick={handleDismissIOSPrompt}
          className="bg-canvas text-brand px-3 py-1 rounded text-sm font-bold shadow hover:bg-surface transition"
        >
          Fechar
        </button>
      </div>
    );
  }

  if (!showInstall) return null;

  return (
    <div className="bg-brand text-white p-3 flex justify-between items-center fixed top-0 left-0 w-full z-50 shadow-md">
      <span className="text-sm font-semibold">Instale nosso app para um acesso mais rápido!</span>
      <button
        onClick={handleInstallClick}
        className="bg-canvas text-brand px-3 py-1 rounded text-sm font-bold shadow hover:bg-surface transition"
      >
        Instalar
      </button>
    </div>
  );
};

export default InstallPrompt;
