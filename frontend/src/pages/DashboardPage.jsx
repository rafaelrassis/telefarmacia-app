import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PatientDashboard from '../components/PatientDashboard.jsx';
import PharmacistDashboard from '../components/PharmacistDashboard.jsx';
import AdminPanel from '../components/AdminPanel.jsx';
import EnvSelector from '../components/EnvSelector.jsx';

const ENV_LABELS = {
  patient:     { label: 'Paciente',         icon: '🧑' },
  pharmacist:  { label: 'Farmacêutico',     icon: '👨‍⚕️' },
  admin:       { label: 'Administração',    icon: '⚙' },
};

const DashboardPage = () => {
  const { user, activeEnv, needsEnvSelection, availableEnvs, switchEnv } = useAuth();

  if (!user) return <Navigate to="/entrar" replace />;

  // Mostra seletor de ambiente se necessário
  if (needsEnvSelection) return <EnvSelector />;

  // Se por algum motivo não tem env salvo, define patient como padrão
  const env = activeEnv || 'patient';
  const envCfg = ENV_LABELS[env] || ENV_LABELS.patient;
  const hasMultipleEnvs = availableEnvs.length > 1;

  return (
    <div className="min-h-[calc(100vh-60px)] bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base">{envCfg.icon}</span>
            <div>
              <h1 className="text-sm font-bold text-gray-900">{envCfg.label}</h1>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>

          {hasMultipleEnvs && (
            <button
              onClick={switchEnv}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition"
            >
              <span>↔</span>
              Trocar ambiente
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {env === 'admin' && <AdminPanel />}
        {env === 'pharmacist' && <PharmacistDashboard />}
        {env === 'patient' && <PatientDashboard />}
      </div>
    </div>
  );
};

export default DashboardPage;
