import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const ENV_COLOR = {
  patient:     'bg-blue-50 text-blue-700 border-blue-100',
  pharmacist:  'bg-purple-50 text-purple-700 border-purple-100',
  admin:       'bg-rose-50 text-rose-700 border-rose-100',
};
const ENV_LABEL = { patient: 'Paciente', pharmacist: 'Farmacêutico', admin: 'Admin' };

const Navbar = ({ onRegisterPharmacist }) => {
  const { user, logout, activeEnv, availableEnvs, switchEnv } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === '/';

  const handleLogout = () => { logout(); navigate('/'); };

  const scrollTo = (id) => {
    setMenuOpen(false);
    if (!isHome) {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo + nav links grouped */}
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-200">
              F
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Farma<span className="text-blue-600">Consulta</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button onClick={() => scrollTo('como-funciona')} className="hover:text-blue-600 transition">Como Funciona</button>
            <button onClick={() => scrollTo('especialidades')} className="hover:text-blue-600 transition">Especialidades</button>
            <button onClick={() => scrollTo('farmaceuticos')} className="hover:text-blue-600 transition">Farmacêuticos</button>
          </div>
        </div>

        {/* Right side actions */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="text-slate-500">
                Olá, <strong className="text-slate-700 font-semibold">{user.name?.split(' ')[0]}</strong>
              </span>
              {availableEnvs.length > 1 && activeEnv && (
                <button
                  onClick={switchEnv}
                  className={`px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 text-xs transition hover:opacity-80 ${ENV_COLOR[activeEnv] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {ENV_LABEL[activeEnv] || 'Ambiente'}
                </button>
              )}
              <Link to="/dashboard" className="font-semibold text-blue-600 hover:text-blue-700 transition">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition">
                Sair
              </button>
            </>
          ) : (
            <>
              {onRegisterPharmacist && (
                <button onClick={onRegisterPharmacist} className="text-slate-600 font-medium hover:text-blue-600 transition">
                  Sou farmacêutico
                </button>
              )}
              <Link
                to="/entrar"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-sm shadow-blue-200"
              >
                Entrar
              </Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-4 space-y-1">
          <button onClick={() => scrollTo('como-funciona')} className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Como Funciona</button>
          <button onClick={() => scrollTo('especialidades')} className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Especialidades</button>
          <button onClick={() => scrollTo('farmaceuticos')} className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Farmacêuticos</button>
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {user ? (
              <>
                {availableEnvs.length > 1 && (
                  <button onClick={() => { setMenuOpen(false); switchEnv(); }} className="block w-full text-left px-3 py-2 text-sm text-slate-500 rounded-lg hover:bg-slate-50">
                    ↔ Trocar ambiente ({ENV_LABEL[activeEnv] || '—'})
                  </button>
                )}
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-blue-600 rounded-lg hover:bg-blue-50">Dashboard</Link>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-slate-400 rounded-lg hover:bg-slate-50">Sair</button>
              </>
            ) : (
              <>
                {onRegisterPharmacist && (
                  <button onClick={() => { setMenuOpen(false); onRegisterPharmacist(); }} className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50">Sou farmacêutico</button>
                )}
                <Link to="/entrar" onClick={() => setMenuOpen(false)} className="block text-center bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-sm mt-2">
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
