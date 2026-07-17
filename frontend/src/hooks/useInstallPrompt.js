import { useState, useEffect, useCallback } from 'react';
import { getDeferredPrompt, subscribe, triggerInstall } from '../lib/installPrompt.js';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

function getIsStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(getDeferredPrompt());
  const [isStandalone, setIsStandalone] = useState(getIsStandalone());

  useEffect(() => {
    const unsubscribe = subscribe((prompt) => {
      setDeferredPrompt(prompt);
      if (!prompt && getIsStandalone()) setIsStandalone(true);
    });
    // Sincroniza caso o evento tenha chegado entre o render inicial e o effect
    setDeferredPrompt(getDeferredPrompt());
    return unsubscribe;
  }, []);

  const promptInstall = useCallback(() => triggerInstall(), []);

  return {
    isIOS,
    isStandalone,
    canInstall: Boolean(deferredPrompt) && !isStandalone,
    promptInstall,
  };
}
