import { useState, useCallback, useEffect } from 'react';
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '../utils/push';
import { Sentry } from '../monitoring/sentry';

// Pede permissão de notificação só após uma ação relevante (nunca no load) e,
// se concedida, registra a subscription de push.
export function usePushToggle(token) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);
  const [pushError, setPushError] = useState(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    getCurrentPushSubscription().then((sub) => setPushEnabled(Boolean(sub))).catch(() => {});
  }, []);

  const maybeRequestPush = useCallback(async () => {
    setPushError(null);
    try {
      if (typeof Notification === 'undefined') {
        setPushError('unsupported');
        return;
      }
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'denied') {
        setPushError('denied');
        return;
      }
      if (Notification.permission === 'granted') {
        const sub = await subscribeToPush(token);
        if (sub) {
          setPushEnabled(true);
        } else {
          setPushError('server-error');
        }
      }
    } catch (err) {
      setPushError('server-error');
      Sentry.captureException(err);
    }
  }, [token]);

  const togglePush = async () => {
    setPushError(null);
    setTogglingPush(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(token);
        setPushEnabled(false);
      } else {
        if (typeof Notification === 'undefined') {
          setPushError('unsupported');
          setTogglingPush(false);
          return;
        }
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        if (Notification.permission === 'denied') {
          setPushError('denied');
          setTogglingPush(false);
          return;
        }
        const sub = await subscribeToPush(token);
        if (sub) {
          setPushEnabled(true);
        } else {
          setPushError('server-error');
        }
      }
    } catch (err) {
      setPushError('server-error');
      Sentry.captureException(err);
    }
    setTogglingPush(false);
  };

  return { pushEnabled, togglingPush, pushError, maybeRequestPush, togglePush };
}
