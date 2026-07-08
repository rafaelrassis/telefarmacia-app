import { useState, useCallback, useEffect } from 'react';
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '../utils/push';

// Pede permissão de notificação só após uma ação relevante (nunca no load) e,
// se concedida, registra a subscription de push.
export function usePushToggle(token) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    getCurrentPushSubscription().then((sub) => setPushEnabled(Boolean(sub))).catch(() => {});
  }, []);

  const maybeRequestPush = useCallback(async () => {
    try {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        const sub = await subscribeToPush(token);
        if (sub) setPushEnabled(true);
      }
    } catch { /* silencioso — push é conveniência, não bloqueia o fluxo */ }
  }, [token]);

  const togglePush = async () => {
    setTogglingPush(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(token);
        setPushEnabled(false);
      } else {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        const sub = await subscribeToPush(token);
        setPushEnabled(Boolean(sub));
      }
    } catch { /* silencioso */ }
    setTogglingPush(false);
  };

  return { pushEnabled, togglingPush, maybeRequestPush, togglePush };
}
