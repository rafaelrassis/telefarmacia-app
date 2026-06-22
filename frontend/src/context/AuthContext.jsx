import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

const STORAGE_TOKEN = '@Telefarmacia:token';
const STORAGE_USER  = '@Telefarmacia:user';
const STORAGE_ENV   = '@Telefarmacia:env';

const getAvailableEnvs = (userData) => {
  const envs = ['patient'];
  if (userData?.role === 'FARMACEUTICO') envs.push('pharmacist');
  if (userData?.isAdmin) envs.push('admin');
  return envs;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken]   = useState(() => localStorage.getItem(STORAGE_TOKEN) || null);
  const [user,  setUser]    = useState(null);
  const [activeEnv, setActiveEnvState] = useState(() => localStorage.getItem(STORAGE_ENV) || null);
  const [needsEnvSelection, setNeedsEnvSelection] = useState(false);

  // Restaura usuário do localStorage na carga inicial (page refresh)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_USER);
    if (stored && stored !== 'undefined' && token) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Na restauração (page refresh), activeEnv já vem do localStorage via useState init
        // não precisa mostrar o seletor
      } catch {
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_USER);
        setToken(null);
      }
    }
  }, []);

  const login = (jwtToken, userData) => {
    localStorage.setItem(STORAGE_TOKEN, jwtToken);
    localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);

    const envs = getAvailableEnvs(userData);
    const savedEnv = localStorage.getItem(STORAGE_ENV);

    if (envs.length === 1) {
      // Paciente puro: entra direto, sem seletor
      const env = 'patient';
      localStorage.setItem(STORAGE_ENV, env);
      setActiveEnvState(env);
      setNeedsEnvSelection(false);
    } else if (savedEnv && envs.includes(savedEnv)) {
      // Tem preferência salva e ainda é válida: usa direto
      setActiveEnvState(savedEnv);
      setNeedsEnvSelection(false);
    } else {
      // Múltiplos ambientes sem preferência salva: mostra seletor
      setNeedsEnvSelection(true);
      setActiveEnvState(null);
    }
  };

  const setActiveEnv = (env) => {
    localStorage.setItem(STORAGE_ENV, env);
    setActiveEnvState(env);
    setNeedsEnvSelection(false);
  };

  // Abre o seletor novamente (botão "Trocar ambiente")
  const switchEnv = () => {
    setNeedsEnvSelection(true);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const newToken = data.token || token;
      const userData = { ...data };
      delete userData.token;
      localStorage.setItem(STORAGE_TOKEN, newToken);
      localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    // Mantém STORAGE_ENV para lembrar preferência na próxima sessão
    setToken(null);
    setUser(null);
    setActiveEnvState(null);
    setNeedsEnvSelection(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      activeEnv,
      needsEnvSelection,
      availableEnvs: user ? getAvailableEnvs(user) : ['patient'],
      login,
      logout,
      refreshUser,
      setActiveEnv,
      switchEnv,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
