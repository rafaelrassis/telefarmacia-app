import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RedefinirSenhaPage from './pages/RedefinirSenhaPage.jsx';
import ConfirmarEmailPage from './pages/ConfirmarEmailPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SelecionarPerfilPage from './pages/SelecionarPerfilPage.jsx';
import InviteRegistro from './components/InviteRegistro.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import PWAReloadPrompt from './components/PWAReloadPrompt.jsx';

function App() {
  return (
    <>
      <InstallPrompt />
      <PWAReloadPrompt />
      <Routes>
        {/* Rota pública sem layout: onboarding via convite */}
        <Route path="convite/:token" element={<InviteRegistro />} />

        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="entrar" element={<LoginPage />} />
          <Route path="redefinir-senha" element={<RedefinirSenhaPage />} />
          <Route path="confirmar-email" element={<ConfirmarEmailPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="selecionar-perfil" element={<SelecionarPerfilPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
