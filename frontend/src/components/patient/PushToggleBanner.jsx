import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { isPushSupported } from '../../utils/push';

const PushToggleBanner = ({ pushEnabled, togglingPush, togglePush }) => {
  if (!isPushSupported() || typeof Notification === 'undefined' || Notification.permission === 'default') return null;

  const Icon = pushEnabled ? Bell : BellOff;

  return (
    <div className="flex items-center justify-between gap-3 border border-dashed border-line rounded-xl px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${pushEnabled ? 'text-brand' : 'text-muted'}`} strokeWidth={2} />
        <p className="text-xs text-muted truncate">
          {pushEnabled ? 'Notificações push ativas' : 'Ativar notificações push'}
        </p>
      </div>
      <button
        onClick={togglePush}
        disabled={togglingPush}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          pushEnabled ? 'bg-brand' : 'bg-line'
        }`}
        role="switch"
        aria-checked={pushEnabled}
        aria-label="Notificações push"
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-canvas shadow ring-0 transition duration-200 ${
          pushEnabled ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
};

export default PushToggleBanner;
