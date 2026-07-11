import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, ChevronDown, Menu, X, CheckCircle2, FileText, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import PerfilModal from './PerfilModal.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ENV_CFG = {
  patient:    { label: 'Paciente',     dotCls: 'bg-brand',   badgeCls: 'bg-brand-wash text-brand-deep border-brand/20'     },
  pharmacist: { label: 'Farmacêutico', dotCls: 'bg-success', badgeCls: 'bg-success-wash text-success border-success/20'   },
  admin:      { label: 'Admin',        dotCls: 'bg-alert',   badgeCls: 'bg-alert-wash text-alert border-alert/20'         },
};

function fmtRelativo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'agora';
  if (diff < 3600) return `há ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.round(diff / 3600)}h`;
  return `há ${Math.round(diff / 86400)}d`;
}

const NOTIF_ICON = {
  consulta_aceita: CheckCircle2,
  lembrete_24h:    Bell,
  documento:       FileText,
  estorno:         Wallet,
};

const Navbar = () => {
  const { user, token, logout, activeEnv, availableEnvs, setActiveEnv } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPerfil, setShowPerfil]     = useState(false);
  const dropRef = useRef(null);

  // ── Notificações ─────────────────────────────────────────────────────────
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifData,    setNotifData]    = useState({ naoLidas: 0, notificacoes: [] });
  const notifRef = useRef(null);

  const showNotifBell = (activeEnv === 'patient' || activeEnv === 'pharmacist') && Boolean(user);

  const fetchNotificacoes = useCallback(async () => {
    if (!token || !showNotifBell) return;
    try {
      const res = await fetch(`${API_URL}/api/paciente/notificacoes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifData(await res.json());
    } catch {}
  }, [token, showNotifBell]);

  useEffect(() => {
    fetchNotificacoes();
    if (!showNotifBell) return;
    const id = setInterval(fetchNotificacoes, 30000);
    return () => clearInterval(id);
  }, [fetchNotificacoes, showNotifBell]);

  const handleOpenNotif = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && notifData.naoLidas > 0) {
      // Marcar como lidas
      try {
        await fetch(`${API_URL}/api/paciente/notificacoes/marcar-lidas`, {
          method:  'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifData((d) => ({
          ...d,
          naoLidas:      0,
          notificacoes:  d.notificacoes.map((n) => ({ ...n, lida: true })),
        }));
      } catch {}
    }
  };

  // Fecha painel de notificações ao clicar fora
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const handleLogout = () => { logout(); navigate('/entrar'); };

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const activeCfg   = ENV_CFG[activeEnv] ?? ENV_CFG.patient;
  const hasMultiple = availableEnvs.length > 1;
  const firstName   = user?.name?.split(' ')[0] || '';

  const Logo = ({ linked }) => (
    <div className={`flex items-center gap-2 shrink-0 ${!linked ? 'cursor-default select-none' : ''}`}>
      <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-brand-wash">
        F
      </div>
      <span className="text-xl font-heading font-bold tracking-tight text-ink">
        Farma<span className="text-brand-deep">Consulta</span>
      </span>
    </div>
  );

  return (
    <>
      <nav className="bg-canvas/95 backdrop-blur-md border-b border-line sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          {user
            ? <Link to="/dashboard"><Logo linked /></Link>
            : <Link to="/"><Logo linked /></Link>
          }

          {/* Desktop — lado direito */}
          <div className="hidden md:flex items-center gap-3 text-sm">
            {user ? (
              <>
                {/* Olá, Nome */}
                <span className="text-muted">
                  Olá, <strong className="text-ink font-semibold">{firstName}</strong>
                </span>

                {/* Badge perfil ativo */}
                <span className={`px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 text-xs ${activeCfg.badgeCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeCfg.dotCls}`} />
                  {activeCfg.label}
                </span>

                {/* Trocar perfil (só se >1 env) */}
                {hasMultiple && (
                  <div className="relative" ref={dropRef}>
                    <button
                      onClick={() => setDropdownOpen((v) => !v)}
                      className="flex items-center gap-1 text-xs font-medium text-muted border border-line hover:border-line px-3 py-1.5 rounded-lg hover:bg-surface transition"
                    >
                      Trocar perfil
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-canvas border border-line rounded-xl shadow-lg py-1 w-48 z-50">
                        {availableEnvs.map((envId) => {
                          const cfg       = ENV_CFG[envId] ?? ENV_CFG.patient;
                          const isCurrent = envId === activeEnv;
                          return (
                            <button
                              key={envId}
                              onClick={() => {
                                setDropdownOpen(false);
                                if (!isCurrent) { setActiveEnv(envId); navigate('/dashboard'); }
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition ${
                                isCurrent
                                  ? 'bg-surface text-muted cursor-default'
                                  : 'hover:bg-surface text-ink'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotCls}`} />
                              {cfg.label}
                              {isCurrent && (
                                <span className="ml-auto text-xs text-muted">atual</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sininho de notificações (paciente e farmacêutico) */}
                {showNotifBell && (
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={handleOpenNotif}
                      className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-line hover:border-line hover:bg-surface transition text-muted"
                      aria-label="Notificações"
                    >
                      <Bell className="w-5 h-5" />
                      {notifData.naoLidas > 0 && (
                        <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold leading-none px-[5px] py-[2px] rounded-full min-w-[16px] text-center">
                          {notifData.naoLidas > 9 ? '9+' : notifData.naoLidas}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-canvas border border-line rounded-2xl shadow-lg z-[60] overflow-hidden">
                        <div className="px-4 pt-3.5 pb-2.5 border-b border-line flex justify-between items-center">
                          <span className="text-[13px] font-bold text-ink">Notificações</span>
                          {notifData.naoLidas > 0 && (
                            <span className="text-[11px] text-error font-semibold">{notifData.naoLidas} não lida{notifData.naoLidas > 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <div className="max-h-[380px] overflow-y-auto">
                          {notifData.notificacoes.length === 0 ? (
                            <p className="text-[13px] text-muted text-center py-6 px-4">Nenhuma notificação.</p>
                          ) : notifData.notificacoes.map((n) => {
                            const NotifIcon = NOTIF_ICON[n.tipo] ?? Bell;
                            return (
                              <div key={n.id} className={`px-4 py-3 border-b border-line flex gap-2.5 items-start ${n.lida ? 'bg-canvas' : 'bg-brand-wash'}`}>
                                <NotifIcon className="w-[18px] h-[18px] text-brand-deep shrink-0 mt-0.5" strokeWidth={1.75} />
                                <div className="flex-1 min-w-0">
                                  <p className="m-0 text-[13px] font-semibold text-ink">{n.titulo}</p>
                                  <p className="mt-0.5 text-xs text-muted leading-snug">{n.mensagem}</p>
                                  <p className="mt-[3px] text-[11px] text-muted">{fmtRelativo(n.criadoEm)}</p>
                                </div>
                                {!n.lida && (
                                  <span className="w-[7px] h-[7px] rounded-full bg-brand shrink-0 mt-1.5" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meu Perfil */}
                <button
                  onClick={() => setShowPerfil(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted border border-line hover:border-line px-3 py-1.5 rounded-lg hover:bg-surface transition"
                >
                  <User className="w-3.5 h-3.5" />
                  Meu Perfil
                </button>

                {/* Sair */}
                <button
                  onClick={handleLogout}
                  className="text-xs text-muted hover:text-error transition font-medium"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/entrar"
                className="bg-brand hover:bg-brand-deep text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-sm shadow-brand-wash"
              >
                Entrar
              </Link>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            className="md:hidden p-2 rounded-lg text-muted hover:bg-surface transition"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden bg-canvas border-t border-line px-4 pb-4 space-y-1">
            {user ? (
              <>
                {/* Nome + badge */}
                <div className="px-3 py-3 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted">
                    Olá, <strong className="text-ink">{firstName}</strong>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold border text-xs flex items-center gap-1 ${activeCfg.badgeCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activeCfg.dotCls}`} />
                    {activeCfg.label}
                  </span>
                </div>

                {/* Trocar perfil — mobile: lista cada env */}
                {hasMultiple && (
                  <div className="border-t border-line pt-1">
                    <p className="px-3 py-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
                      Trocar perfil
                    </p>
                    {availableEnvs.map((envId) => {
                      const cfg       = ENV_CFG[envId] ?? ENV_CFG.patient;
                      const isCurrent = envId === activeEnv;
                      return (
                        <button
                          key={envId}
                          onClick={() => {
                            if (isCurrent) return;
                            setMenuOpen(false);
                            setActiveEnv(envId);
                            navigate('/dashboard');
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${
                            isCurrent
                              ? 'text-muted cursor-default'
                              : 'text-muted hover:bg-surface'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotCls}`} />
                          {cfg.label}
                          {isCurrent && <span className="ml-auto text-xs">atual</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-line pt-1">
                  {showNotifBell && (
                    <button
                      onClick={() => { setMenuOpen(false); handleOpenNotif(); }}
                      className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-muted rounded-lg hover:bg-surface"
                    >
                      <span className="inline-flex items-center gap-1.5"><Bell className="w-4 h-4" /> Notificações</span>
                      {notifData.naoLidas > 0 && (
                        <span className="bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {notifData.naoLidas}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); setShowPerfil(true); }}
                    className="flex items-center gap-1.5 w-full text-left px-3 py-2 text-sm text-muted rounded-lg hover:bg-surface"
                  >
                    <User className="w-4 h-4" />
                    Meu Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-sm text-muted rounded-lg hover:bg-surface"
                  >
                    Sair
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/entrar"
                onClick={() => setMenuOpen(false)}
                className="block text-center bg-brand text-white font-bold py-3 px-4 rounded-xl text-sm mt-2"
              >
                Entrar
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Modal Meu Perfil */}
      {showPerfil && <PerfilModal onClose={() => setShowPerfil(false)} />}
    </>
  );
};

export default Navbar;
