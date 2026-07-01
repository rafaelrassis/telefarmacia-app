import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PatientDashboard from '../components/PatientDashboard.jsx';
import PharmacistDashboard from '../components/PharmacistDashboard.jsx';
import AdminPanel from '../components/AdminPanel.jsx';

const DashboardPage = () => {
  const { user, activeEnv, needsEnvSelection } = useAuth();

  if (!user) return <Navigate to="/entrar" replace />;
  if (needsEnvSelection) return <Navigate to="/selecionar-perfil" replace />;

  const env = activeEnv || 'patient';

  return (
    <div className="min-h-[calc(100vh-60px)] bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {env === 'admin' && <AdminPanel />}
        {env === 'pharmacist' && <PharmacistDashboard />}
        {env === 'patient' && <PatientDashboard />}
      </div>
    </div>
  );
};

export default DashboardPage;
