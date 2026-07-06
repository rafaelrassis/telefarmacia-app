import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import TermoConsentimento from '../TermoConsentimento.jsx';
import ExcluirContaModal from '../ExcluirContaModal.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ENV_CFG = {
  patient:    { label: 'Paciente',     dotCls: 'bg-blue-500',   badgeCls: 'bg-blue-50 text-blue-700 border-blue-100'       },
  pharmacist: { label: 'Farmacêutico', dotCls: 'bg-violet-500', badgeCls: 'bg-violet-50 text-violet-700 border-violet-100' },
  admin:      { label: 'Admin',        dotCls: 'bg-red-500',    badgeCls: 'bg-red-50 text-red-700 border-red-100'          },
};

// ── Modal Meu Perfil ──────────────────────────────────────────────────────────

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const maskPhone = (v) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};
const maskCEP = (v) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
};
const maskCPF = (v) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-400 outline-none transition';
const inpRO = 'w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed';
const lbl = 'block text-xs font-semibold text-gray-600 mb-1';
const sec = 'text-xs font-bold text-gray-500 uppercase tracking-wide mt-5 mb-3 flex items-center gap-2';

const PerfilModal = ({ onClose }) => {
  const { user, token, refreshUser, logout } = useAuth();
  const isFarm = user?.role === 'FARMACEUTICO';

  const [form, setForm] = useState({
    name: '', phone: '',
    genero: '', peso: '',
    cep: '', logradouro: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '',
    crfNumber: '', crfUF: '', bio: '', tempoExperiencia: '',
  });
  const [readOnly, setReadOnly] = useState({ cpf: '', data_nascimento: '' });
  const [photo, setPhoto]       = useState(null);
  const [preview, setPreview]   = useState(null);
  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [loadingInit, setLoadingInit]   = useState(true);
  const [saving, setSaving]   = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  // Consentimento
  const [consentInfo, setConsentInfo]         = useState(null); // { aceito, versao, aceitoEm }
  const [showTermoModal, setShowTermoModal]   = useState(false);

  // LGPD
  const [downloadingDados, setDownloadingDados] = useState(false);
  const [showExcluirModal, setShowExcluirModal] = useState(false);

  const set = (k) => (e) => {
    const raw = e.target.value;
    if (k === 'phone') return setForm(p => ({ ...p, phone: maskPhone(raw) }));
    if (k === 'cep')   return setForm(p => ({ ...p, cep:   maskCEP(raw)   }));
    setForm(p => ({ ...p, [k]: raw }));
  };

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/usuario/perfil`,       { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {}),
      fetch(`${API_URL}/api/consent/telefarmacia`,  { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([d, consent]) => {
      setForm({
        name:    d.name    || '',
        phone:   maskPhone(d.phone || ''),
        genero:  d.genero  || '',
        peso:    d.peso != null ? String(d.peso) : '',
        cep:         d.cep         ? maskCEP(d.cep)  : '',
        logradouro:  d.logradouro  || '',
        numero:      d.numero      || '',
        complemento: d.complemento || '',
        bairro:      d.bairro      || '',
        cidade:      d.cidade      || '',
        estado:      d.estado      || '',
        crfNumber:        d.crfNumber        || '',
        crfUF:            d.crfUF            || '',
        bio:              d.bio              || '',
        tempoExperiencia: d.tempoExperiencia || '',
      });
      setReadOnly({
        cpf: d.cpf ? maskCPF(d.cpf) : '',
        data_nascimento: d.data_nascimento
          ? new Date(d.data_nascimento).toLocaleDateString('pt-BR')
          : '',
      });
      setPreview(d.photoUrl ? `${API_URL}${d.photoUrl}` : null);
      if (consent) setConsentInfo(consent);
    })
    .catch(() => {})
    .finally(() => setLoadingInit(false));
  }, [token]);

  const lookupCEP = async (cepVal) => {
    const digits = cepVal.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(p => ({
          ...p,
          logradouro: data.logradouro || p.logradouro,
          bairro:     data.bairro     || p.bairro,
          cidade:     data.localidade || p.cidade,
          estado:     data.uf         || p.estado,
        }));
      }
    } catch {}
    setCepLoading(false);
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg('Nome não pode estar vazio.'); return; }
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('name',             form.name.trim());
      fd.append('phone',            form.phone.replace(/\D/g, ''));
      fd.append('genero',           form.genero);
      fd.append('peso',             form.peso);
      fd.append('cep',              form.cep.replace(/\D/g, ''));
      fd.append('logradouro',       form.logradouro);
      fd.append('numero',           form.numero);
      fd.append('complemento',      form.complemento);
      fd.append('bairro',           form.bairro);
      fd.append('cidade',           form.cidade);
      fd.append('estado',           form.estado);
      fd.append('crfNumber',        form.crfNumber);
      fd.append('crfUF',            form.crfUF);
      fd.append('bio',              form.bio);
      fd.append('tempoExperiencia', form.tempoExperiencia);
      if (photo) fd.append('photo', photo);

      const res  = await fetch(`${API_URL}/api/usuario/perfil`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await refreshUser();
        setMsg('✅ Perfil atualizado com sucesso!');
        setTimeout(onClose, 1800);
      } else {
        setMsg(data.error || '❌ Erro ao salvar.');
      }
    } catch {
      setMsg('❌ Falha de conexão.');
    }
    setSaving(false);
  };

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 text-lg">Meu Perfil</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl transition">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pb-2">
          {loadingInit ? (
            <div className="py-10 text-center text-sm text-gray-400">Carregando...</div>
          ) : (
            <>
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2 mt-4 mb-2">
                <div className="relative">
                  {preview
                    ? <img src={preview} alt="Foto" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                    : <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-2xl font-bold border-2 border-violet-200">{initials}</div>
                  }
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-sm text-sm select-none">
                    📷<input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhoto} />
                  </label>
                </div>
                <p className="text-xs text-gray-400">Clique no ícone para alterar a foto</p>
              </div>

              {/* Dados pessoais */}
              <div className={sec}><span>👤</span> Dados pessoais</div>
              <div className="space-y-3">
                <div>
                  <label className={lbl}>Nome completo</label>
                  <input type="text" value={form.name} onChange={set('name')} className={inp} />
                </div>
                <div>
                  <label className={lbl}>E-mail</label>
                  <input type="email" value={user?.email || ''} readOnly className={inpRO} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Telefone</label>
                    <input type="tel" value={form.phone} onChange={set('phone')} placeholder="(00) 00000-0000" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Sexo</label>
                    <select value={form.genero} onChange={set('genero')} className={inp}>
                      <option value="">Selecionar</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                      <option value="prefiro não informar">Prefiro não informar</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {readOnly.data_nascimento && (
                    <div>
                      <label className={lbl}>Data de nascimento</label>
                      <input type="text" value={readOnly.data_nascimento} readOnly className={inpRO} title="Não pode ser alterado" />
                    </div>
                  )}
                  {readOnly.cpf && (
                    <div>
                      <label className={lbl}>CPF</label>
                      <input type="text" value={readOnly.cpf} readOnly className={inpRO} title="Não pode ser alterado" />
                    </div>
                  )}
                </div>
                <div style={{ maxWidth: 140 }}>
                  <label className={lbl}>Peso (kg)</label>
                  <input type="number" min="1" max="300" step="0.1" value={form.peso} onChange={set('peso')} placeholder="70" className={inp} />
                </div>
              </div>

              {/* Endereço */}
              <button
                type="button"
                onClick={() => setEnderecoOpen(v => !v)}
                className="mt-5 mb-3 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide w-full text-left"
              >
                <span>📍 Endereço</span>
                <svg className={`w-4 h-4 ml-auto transition-transform ${enderecoOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {enderecoOpen && (
                <div className="space-y-3">
                  <div>
                    <label className={lbl}>CEP</label>
                    <div className="flex gap-2">
                      <input
                        type="text" value={form.cep} onChange={set('cep')}
                        onBlur={() => lookupCEP(form.cep)}
                        placeholder="00000-000" maxLength={9} className={inp}
                      />
                      {cepLoading && <span className="text-xs text-gray-400 self-center shrink-0">Buscando...</span>}
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Logradouro</label>
                    <input type="text" value={form.logradouro} onChange={set('logradouro')} className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Número</label>
                      <input type="text" value={form.numero} onChange={set('numero')} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Complemento</label>
                      <input type="text" value={form.complemento} onChange={set('complemento')} className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Bairro</label>
                    <input type="text" value={form.bairro} onChange={set('bairro')} className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Cidade</label>
                      <input type="text" value={form.cidade} onChange={set('cidade')} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Estado (UF)</label>
                      <select value={form.estado} onChange={set('estado')} className={inp}>
                        <option value="">UF</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Dados profissionais — farmacêutico only */}
              {isFarm && (
                <>
                  <div className={sec}><span>💊</span> Dados Profissionais</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>CRF</label>
                        <input type="text" value={form.crfNumber} onChange={set('crfNumber')} placeholder="12345" className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Estado do CRF</label>
                        <select value={form.crfUF} onChange={set('crfUF')} className={inp}>
                          <option value="">UF</option>
                          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Bio / Apresentação</label>
                      <textarea
                        value={form.bio} onChange={set('bio')} maxLength={300} rows={3}
                        placeholder="Descreva sua especialidade e experiência..."
                        className={inp + ' resize-none'}
                      />
                      <p className="text-right text-xs text-gray-400 mt-0.5">{form.bio.length}/300</p>
                    </div>
                    <div>
                      <label className={lbl}>Tempo de experiência</label>
                      <input type="text" value={form.tempoExperiencia} onChange={set('tempoExperiencia')} placeholder="Ex: 5 anos" className={inp} />
                    </div>
                  </div>
                </>
              )}

              {/* Consentimento — só paciente */}
              {!isFarm && (
                <>
                  <div className={sec}><span>📋</span> Consentimento Informado</div>
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', marginBottom: 4 }}>
                    {/* Alerta de rascunho */}
                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '5px 8px', marginBottom: 8 }}>
                      <p style={{ fontSize: 10, color: '#92400e', margin: 0 }}>⚠️ <strong>Rascunho</strong> — texto pendente de validação jurídica. Não é definitivo.</p>
                    </div>
                    {consentInfo?.aceito ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <p style={{ fontSize: 12, color: '#15803d', fontWeight: 600, margin: 0 }}>✅ Termo aceito</p>
                        <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                          Versão {consentInfo.versao} — {consentInfo.aceitoEm ? new Date(consentInfo.aceitoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, margin: 0 }}>⚠️ Pendente de aceite</p>
                        <button
                          onClick={() => setShowTermoModal(true)}
                          style={{ padding: '4px 10px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Ver e aceitar
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* LGPD — só paciente */}
              {!isFarm && (
                <>
                  <div className={sec}><span>🔒</span> Meus dados (LGPD)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                    <button
                      onClick={async () => {
                        setDownloadingDados(true);
                        try {
                          const r = await fetch(`${API_URL}/api/lgpd/exportar`, { headers: { Authorization: `Bearer ${token}` } });
                          if (!r.ok) throw new Error('Erro ao exportar dados.');
                          const blob = await r.blob();
                          const url  = URL.createObjectURL(blob);
                          const a    = document.createElement('a');
                          a.href     = url;
                          a.download = `meus-dados-farmaconsulta-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err) { alert(err.message); }
                        finally { setDownloadingDados(false); }
                      }}
                      disabled={downloadingDados}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#374151', background: 'white', cursor: downloadingDados ? 'wait' : 'pointer', textAlign: 'left', opacity: downloadingDados ? 0.7 : 1 }}
                    >
                      {downloadingDados ? '⏳ Exportando...' : '⬇️ Baixar meus dados (JSON)'}
                    </button>
                    <button
                      onClick={() => setShowExcluirModal(true)}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #fecaca', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', cursor: 'pointer', textAlign: 'left' }}
                    >
                      🗑️ Excluir minha conta
                    </button>
                  </div>
                </>
              )}

              <div className="h-4" />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 pb-5 border-t border-gray-100 shrink-0">
          {msg && (
            <p className={`text-sm text-center font-medium mb-3 ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {msg}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loadingInit}
            className="w-full py-3 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
          >
            {saving ? 'Salvando...' : '💾 Salvar alterações'}
          </button>
        </div>
      </div>
    </div>

    {/* Modais — fora do scroll */}
    {showTermoModal && (
      <TermoConsentimento
        onAceito={() => {
          setShowTermoModal(false);
          setConsentInfo(prev => ({ ...prev, aceito: true, aceitoEm: new Date().toISOString() }));
        }}
        onFechar={() => setShowTermoModal(false)}
      />
    )}
    {showExcluirModal && (
      <ExcluirContaModal onClose={() => setShowExcluirModal(false)} />
    )}
  </>
  );
};

// ── Navbar ────────────────────────────────────────────────────────────────────

const API_URL_NOTIF = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function fmtRelativo(iso) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'agora';
  if (diff < 3600) return `há ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.round(diff / 3600)}h`;
  return `há ${Math.round(diff / 86400)}d`;
}

const NOTIF_ICON = {
  consulta_aceita: '✅',
  lembrete_24h:    '🔔',
  documento:       '📄',
  estorno:         '💰',
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

  const isPaciente = activeEnv === 'patient' && Boolean(user);

  const fetchNotificacoes = useCallback(async () => {
    if (!token || !isPaciente) return;
    try {
      const res = await fetch(`${API_URL_NOTIF}/api/paciente/notificacoes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifData(await res.json());
    } catch {}
  }, [token, isPaciente]);

  useEffect(() => {
    fetchNotificacoes();
    if (!isPaciente) return;
    const id = setInterval(fetchNotificacoes, 30000);
    return () => clearInterval(id);
  }, [fetchNotificacoes, isPaciente]);

  const handleOpenNotif = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && notifData.naoLidas > 0) {
      // Marcar como lidas
      try {
        await fetch(`${API_URL_NOTIF}/api/paciente/notificacoes/marcar-lidas`, {
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
      <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-200">
        F
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-900">
        Farma<span className="text-blue-600">Consulta</span>
      </span>
    </div>
  );

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 shadow-sm">
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
                <span className="text-slate-500">
                  Olá, <strong className="text-slate-700 font-semibold">{firstName}</strong>
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
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
                    >
                      Trocar perfil
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-48 z-50">
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
                                  ? 'bg-slate-50 text-slate-400 cursor-default'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotCls}`} />
                              {cfg.label}
                              {isCurrent && (
                                <span className="ml-auto text-xs text-slate-300">atual</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sininho de notificações (só paciente) */}
                {isPaciente && (
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={handleOpenNotif}
                      className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-slate-600"
                      aria-label="Notificações"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {notifData.naoLidas > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4,
                          background: '#ef4444', color: 'white',
                          fontSize: 10, fontWeight: 700, lineHeight: 1,
                          padding: '2px 5px', borderRadius: 10,
                          minWidth: 16, textAlign: 'center',
                        }}>
                          {notifData.naoLidas > 9 ? '9+' : notifData.naoLidas}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                        width: 320, background: 'white',
                        border: '1px solid #e5e7eb', borderRadius: 14,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        zIndex: 60, overflow: 'hidden',
                      }}>
                        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Notificações</span>
                          {notifData.naoLidas > 0 && (
                            <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{notifData.naoLidas} não lida{notifData.naoLidas > 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                          {notifData.notificacoes.length === 0 ? (
                            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '24px 16px' }}>Nenhuma notificação.</p>
                          ) : notifData.notificacoes.map((n) => (
                            <div key={n.id} style={{
                              padding: '12px 16px', borderBottom: '1px solid #f9fafb',
                              background: n.lida ? 'white' : '#f5f3ff',
                              display: 'flex', gap: 10, alignItems: 'flex-start',
                            }}>
                              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{NOTIF_ICON[n.tipo] ?? '🔔'}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{n.titulo}</p>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{n.mensagem}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>{fmtRelativo(n.criadoEm)}</p>
                              </div>
                              {!n.lida && (
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, marginTop: 5 }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meu Perfil */}
                <button
                  onClick={() => setShowPerfil(true)}
                  className="text-xs font-medium text-slate-600 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
                >
                  👤 Meu Perfil
                </button>

                {/* Sair */}
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-rose-500 transition font-medium"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/entrar"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-sm shadow-blue-200"
              >
                Entrar
              </Link>
            )}
          </div>

          {/* Hamburger (mobile) */}
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

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-4 space-y-1">
            {user ? (
              <>
                {/* Nome + badge */}
                <div className="px-3 py-3 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-500">
                    Olá, <strong className="text-slate-700">{firstName}</strong>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold border text-xs flex items-center gap-1 ${activeCfg.badgeCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activeCfg.dotCls}`} />
                    {activeCfg.label}
                  </span>
                </div>

                {/* Trocar perfil — mobile: lista cada env */}
                {hasMultiple && (
                  <div className="border-t border-slate-100 pt-1">
                    <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
                              ? 'text-slate-300 cursor-default'
                              : 'text-slate-600 hover:bg-slate-50'
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

                <div className="border-t border-slate-100 pt-1">
                  {isPaciente && (
                    <button
                      onClick={() => { setMenuOpen(false); handleOpenNotif(); }}
                      className="flex items-center justify-between w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50"
                    >
                      <span>🔔 Notificações</span>
                      {notifData.naoLidas > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                          {notifData.naoLidas}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); setShowPerfil(true); }}
                    className="block w-full text-left px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50"
                  >
                    👤 Meu Perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-sm text-slate-400 rounded-lg hover:bg-slate-50"
                  >
                    Sair
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/entrar"
                onClick={() => setMenuOpen(false)}
                className="block text-center bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-sm mt-2"
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
