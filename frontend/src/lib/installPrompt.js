// Captura o beforeinstallprompt em nível de módulo, antes do React montar.
// O Chrome dispara esse evento uma única vez por page load; se o listener
// só existir após o mount, o evento pode ser perdido em aparelhos lentos.

const INSTALLED_FLAG_KEY = '@Telefarmacia:pwaInstalada';

let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(deferredPrompt));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // O Chrome só dispara este evento se o app NÃO está instalado — flag obsoleta
    try { localStorage.removeItem(INSTALLED_FLAG_KEY); } catch { /* storage indisponível */ }
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    try { localStorage.setItem(INSTALLED_FLAG_KEY, '1'); } catch { /* storage indisponível */ }
    notify();
  });
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function hasInstalledFlag() {
  try { return localStorage.getItem(INSTALLED_FLAG_KEY) === '1'; } catch { return false; }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function triggerInstall() {
  if (!deferredPrompt) return null;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome;
}
