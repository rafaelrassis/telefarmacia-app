import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

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

  if (!showInstall) return null;

  return (
    <div className="bg-brand text-brand-contrast p-3 flex justify-between items-center fixed top-0 left-0 w-full z-50 shadow-md">
      <span className="text-sm font-semibold">Instale nosso app para um acesso mais rápido!</span>
      <button
        onClick={handleInstallClick}
        className="bg-canvas text-brand-deep px-3 py-1 rounded text-sm font-bold shadow hover:bg-surface transition"
      >
        Instalar
      </button>
    </div>
  );
};

export default InstallPrompt;