import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Login from '../components/Login.jsx';

const LoginPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-3 block">💊</span>
          <h1 className="text-2xl font-extrabold text-gray-900">Bem-vindo ao Telefarmácia</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Entre com sua conta Google para acessar ou criar sua conta.
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-xl shadow-purple-100 border border-purple-100 p-8">
          <Login />
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          Ao entrar, você concorda com nossos{' '}
          <span className="text-violet-600 cursor-pointer hover:underline">Termos de Uso</span>
          {' '}e{' '}
          <span className="text-violet-600 cursor-pointer hover:underline">Política de Privacidade</span>.
          <br />
          As consultas não substituem prescrição ou diagnóstico médico.
        </p>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-violet-600 transition">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
