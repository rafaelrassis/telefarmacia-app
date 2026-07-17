import { useState, useEffect, useCallback } from 'react';
import { getDeferredPrompt, subscribe, triggerInstall, hasInstalledFlag } from '../lib/installPrompt.js';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

function getIsStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(getDeferredPrompt());
  const [isStandalone, setIsStandalone] = useState(getIsStandalone());
  const [isInstalled, setIsInstalled] = useState(() => getIsStandalone() || hasInstalledFlag());

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribe((prompt) => {
      setDeferredPrompt(prompt);
      if (!prompt && getIsStandalone()) setIsStandalone(true);
      // beforeinstallprompt só dispara se o app não está instalado — corrige flag obsoleta
      if (prompt) setIsInstalled(getIsStandalone());
    });
    if ('getInstalledRelatedApps' in navigator) {
      navigator.getInstalledRelatedApps()
        .then((apps) => { if (!cancelled && apps.length > 0) setIsInstalled(true); })
        .catch(() => { /* API indisponível ou bloqueada — ignora */ });
    }
    // Sincroniza caso o evento tenha chegado entre o render inicial e o effect
    setDeferredPrompt(getDeferredPrompt());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const promptInstall = useCallback(() => triggerInstall(), []);

  return {
    isIOS,
    isStandalone,
    isInstalled,
    canInstall: Boolean(deferredPrompt) && !isStandalone,
    promptInstall,
  };
}
