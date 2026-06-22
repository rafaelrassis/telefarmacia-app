import React from 'react';
import { useAuth } from '../context/AuthContext';

const ENV_CONFIG = {
  patient: {
    icon: '🧑',
    label: 'Paciente',
    description: 'Agendar consultas, ver histórico e receitas',
    color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  pharmacist: {
    icon: '👨‍⚕️',
    label: 'Farmacêutico',
    description: 'Gerenciar agenda, horários e atender consultas',
    color: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50',
    badge: 'bg-violet-100 text-violet-700',
  },
  admin: {
    icon: '⚙',
    label: 'Administração',
    description: 'Gerenciar usuários, métricas e plataforma',
    color: 'border-gray-300 hover:border-gray-500 hover:bg-gray-50',
    badge: 'bg-gray-100 text-gray-700',
  },
};

const EnvSelector = () => {
  const { user, availableEnvs, setActiveEnv } = useAuth();

  return (
    <div className="min-h-[calc(100vh-60px)] bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Greeting */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400 mb-1">Bem-vindo de volta</p>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Como deseja entrar hoje?</p>

          <div className="space-y-3">
            {availableEnvs.map((envId) => {
              const cfg = ENV_CONFIG[envId];
              return (
                <button
                  key={envId}
                  onClick={() => setActiveEnv(envId)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition duration-150 bg-white ${cfg.color}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${cfg.badge}`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{cfg.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cfg.description}</p>
                  </div>
                  <span className="ml-auto text-gray-300 text-lg">›</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Sua escolha será lembrada na próxima sessão.
        </p>
      </div>
    </div>
  );
};

export default EnvSelector;
