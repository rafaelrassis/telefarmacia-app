#!/bin/bash

BASE_DIR="/home/rafael/Área de trabalho/Projeto/telefarmacia-app"

echo "======================================================="
echo "Instalando dependências de Autenticação e Configurando..."
echo "======================================================="

# 1. BACKEND DEPENDENCIES & FILES
cd "$BASE_DIR/backend"
npm install google-auth-library jsonwebtoken @prisma/client

mkdir -p src/controllers src/routes src/middlewares

cat << 'EOF' > src/controllers/AuthController.js
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          googleId: payload.sub,
          role: 'PACIENTE',
        },
      });
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token: jwtToken, user, isNewUser });
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ error: 'Token do Google inválido.' });
  }
};

export const completeOnboarding = async (req, res) => {
  const { role, crfNumber, crfUF } = req.body;
  const userId = req.user.id;

  try {
    if (role === 'FARMACEUTICO') {
      if (!crfNumber || !crfUF) return res.status(400).json({ error: 'CRF e UF são obrigatórios.' });
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'FARMACEUTICO',
          pharmacistProfile: {
            create: { crfNumber, crfUF, tags: [] },
          },
        },
      });
    }
    
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    const jwtToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    return res.status(200).json({ message: 'Perfil atualizado com sucesso.', user: updatedUser, token: jwtToken });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao salvar perfil de onboarding.' });
  }
};
EOF

cat << 'EOF' > src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};
EOF

cat << 'EOF' > src/routes/authRoutes.js
import { Router } from 'express';
import { googleLogin, completeOnboarding } from '../controllers/AuthController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/google', googleLogin);
router.put('/onboarding', authMiddleware, completeOnboarding);

export default router;
EOF

if ! grep -q "authRoutes" src/app.js; then
  sed -i "s/import userRoutes from '.\/routes\/userRoutes.js';/import userRoutes from '.\/routes\/userRoutes.js';\nimport authRoutes from '.\/routes\/authRoutes.js';/" src/app.js
  sed -i "s/app.use('\/api', userRoutes);/app.use('\/api\/auth', authRoutes);\napp.use('\/api', userRoutes);/" src/app.js
fi

# 2. FRONTEND DEPENDENCIES & FILES
cd "$BASE_DIR/frontend"
npm install @react-oauth/google

mkdir -p src/components src/context

cat << 'EOF' > src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('@Telefarmacia:token') || null);

  useEffect(() => {
    const storedUser = localStorage.getItem('@Telefarmacia:user');
    if (storedUser && token) setUser(JSON.parse(storedUser));
  }, [token]);

  const login = (jwtToken, userData) => {
    localStorage.setItem('@Telefarmacia:token', jwtToken);
    localStorage.setItem('@Telefarmacia:user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('@Telefarmacia:token');
    localStorage.removeItem('@Telefarmacia:user');
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
EOF

cat << 'EOF' > src/components/Login.jsx
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const [onboardingData, setOnboardingData] = useState(null);
  const [role, setRole] = useState('PACIENTE');
  const [crfNumber, setCrfNumber] = useState('');
  const [crfUF, setCrfUF] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    const { credential } = credentialResponse;
    try {
      const res = await fetch('http://localhost:3000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential }),
      });
      const data = await res.json();
      
      if (data.isNewUser) {
        setOnboardingData({ tempToken: data.token, user: data.user });
      } else {
        login(data.token, data.user);
      }
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  const handleOnboardingSubmit = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/onboarding', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${onboardingData.tempToken}`
        },
        body: JSON.stringify({ role, crfNumber, crfUF }),
      });
      const data = await res.json();
      if (res.ok) login(data.token, data.user);
      else alert(data.error || 'Erro ao salvar perfil');
    } catch (error) {
      console.error('Erro no onboarding:', error);
    }
  };

  if (onboardingData) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Complete seu Perfil</h2>
        <p className="mb-4 text-gray-600">Por favor, nos informe seu perfil para continuar:</p>
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="PACIENTE">Sou Paciente</option>
          <option value="FARMACEUTICO">Sou Farmacêutico Clínico</option>
        </select>
        {role === 'FARMACEUTICO' && (
          <>
            <input type="text" placeholder="Número do CRF" value={crfNumber}
              onChange={(e) => setCrfNumber(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
            <input type="text" placeholder="UF do CRF (Ex: SP)" value={crfUF} maxLength={2}
              onChange={(e) => setCrfUF(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
          </>
        )}
        <button onClick={handleOnboardingSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
          Concluir Cadastro
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Acesse sua Conta</h2>
      <p className="text-gray-600 mb-6">Entre com o Google para continuar</p>
      <div className="flex justify-center">
        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.error('Login Failed')} />
      </div>
    </div>
  );
};

export default Login;
EOF

cat << 'EOF' > src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
EOF

cat << 'EOF' > src/App.jsx
import React from 'react';
import { useAuth } from './context/AuthContext.jsx';
import Login from './components/Login.jsx';

function App() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {!user ? (
        <Login />
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Bem-vindo, {user.name}!</h1>
          <p className="text-gray-600 mb-2">Email: {user.email}</p>
          <p className="text-gray-600 mb-6">Perfil: <span className="font-semibold text-blue-600">{user.role}</span></p>
          <button 
            onClick={logout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition"
          >
            Sair da Plataforma
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
EOF

echo "======================================================="
echo "Feito! Pode reiniciar os servidores (backend e frontend)."
echo "======================================================="