import React from 'react';
import { isPushSupported } from '../../utils/push';

const PushToggleBanner = ({ pushEnabled, togglingPush, togglePush }) => {
  if (!isPushSupported() || typeof Notification === 'undefined' || Notification.permission === 'default') return null;

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`text-xl ${pushEnabled ? 'text-brand' : 'text-gray-400'}`}>
          {pushEnabled ? '🔔' : '🔕'}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800">Notificações push</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {pushEnabled
              ? 'Você recebe avisos de aceite, lembrete e orientações prontas'
              : 'Ative para receber avisos mesmo com o app fechado'}
          </p>
        </div>
      </div>
      <button
        onClick={togglePush}
        disabled={togglingPush}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          pushEnabled ? 'bg-brand' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={pushEnabled}
      >
        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          pushEnabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
};

export default PushToggleBanner;
