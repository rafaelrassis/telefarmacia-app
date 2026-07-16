import React, { useState, useEffect } from 'react';
import { Camera, Lock, MapPin, User, Pill, ClipboardList, ShieldCheck, TriangleAlert, CheckCircle2, Download, Trash2, Hourglass, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../ui/Modal.jsx';
import TermoConsentimento from '../TermoConsentimento.jsx';
import ExcluirContaModal from '../ExcluirContaModal.jsx';
import AlterarSenhaForm from '../AlterarSenhaForm.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

const inp   = 'w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink bg-canvas focus:ring-2 focus:ring-brand-wash focus:border-brand outline-none transition';
const lbl   = 'block text-xs font-semibold text-muted mb-1';
const sec   = 'text-xs font-bold text-muted uppercase tracking-wide mt-5 mb-3 flex items-center gap-2';

const ReadOnlyField = ({ label, value }) => (
  <div>
    <label className={lbl}>{label}</label>
    <div className="relative">
      <input
        type="text" value={value} readOnly title="Não pode ser alterado"
        className="w-full border border-line rounded-xl pl-3 pr-9 py-2.5 text-sm bg-surface text-muted cursor-not-allowed"
      />
      <Lock className="w-3.5 h-3.5 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  </div>
);

const ReadOnlyInput = ({ type = 'text', value }) => (
  <div className="relative">
    <input type={type} value={value} readOnly className="w-full border border-line rounded-xl pl-3 pr-9 py-2.5 text-sm bg-surface text-muted cursor-not-allowed" />
    <Lock className="w-3.5 h-3.5 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);

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
  const [msgType, setMsgType] = useState('');

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
    if (!form.name.trim()) { setMsgType('error'); setMsg('Nome não pode estar vazio.'); return; }
    setSaving(true);
    setMsg('');
    setMsgType('');
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
        setMsgType('success');
        setMsg('Perfil atualizado com sucesso!');
        setTimeout(onClose, 1800);
      } else {
        setMsgType('error');
        setMsg(data.error || 'Erro ao salvar.');
      }
    } catch {
      setMsgType('error');
      setMsg('Falha de conexão.');
    }
    setSaving(false);
  };

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
    <Modal
      title="Meu Perfil"
      onClose={onClose}
      maxWidth="max-w-md"
      footer={(
        <>
          {msg && (
            <p className={`text-sm text-center font-medium mb-3 inline-flex items-center justify-center gap-1.5 w-full ${msgType === 'success' ? 'text-success' : 'text-error'}`}>
              {msgType === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <TriangleAlert className="w-4 h-4" />}
              {msg}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loadingInit}
            className="w-full py-3 bg-brand hover:bg-brand-deep disabled:opacity-50 text-brand-contrast font-bold rounded-xl transition text-sm inline-flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </>
      )}
    >
      <div className="px-6 pb-2">
        {loadingInit ? (
          <div className="py-10 text-center text-sm text-muted">Carregando...</div>
        ) : (
          <>
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 mt-4 mb-2">
              <div className="relative">
                {preview
                  ? <img src={preview} alt="Foto" className="w-20 h-20 rounded-full object-cover border-2 border-line" />
                  : <div className="w-20 h-20 rounded-full bg-brand-wash flex items-center justify-center text-brand-deep text-2xl font-bold border-2 border-brand/30">{initials}</div>
                }
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-canvas border border-line rounded-full flex items-center justify-center cursor-pointer hover:bg-surface shadow-sm select-none text-muted">
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhoto} />
                </label>
              </div>
              <p className="text-xs text-muted">Clique no ícone para alterar a foto</p>
            </div>

            {/* Dados pessoais */}
            <div className={sec}><User className="w-3.5 h-3.5" /> Dados pessoais</div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Nome completo</label>
                <input type="text" value={form.name} onChange={set('name')} className={inp} />
              </div>
              <div>
                <label className={lbl}>E-mail</label>
                <ReadOnlyInput type="email" value={user?.email || ''} />
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
                  <ReadOnlyField label="Data de nascimento" value={readOnly.data_nascimento} />
                )}
                {readOnly.cpf && (
                  <ReadOnlyField label="CPF" value={readOnly.cpf} />
                )}
              </div>
              <div className="max-w-[140px]">
                <label className={lbl}>Peso (kg)</label>
                <input type="number" min="1" max="300" step="0.1" value={form.peso} onChange={set('peso')} placeholder="70" className={inp} />
              </div>
            </div>

            {/* Endereço */}
            <button
              type="button"
              onClick={() => setEnderecoOpen(v => !v)}
              className="mt-5 mb-3 flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wide w-full text-left"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Endereço</span>
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
                    {cepLoading && <span className="text-xs text-muted self-center shrink-0">Buscando...</span>}
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
                <div className={sec}><Pill className="w-3.5 h-3.5" /> Dados Profissionais</div>
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
                    <p className="text-right text-xs text-muted mt-0.5">{form.bio.length}/300</p>
                  </div>
                  <div>
                    <label className={lbl}>Tempo de experiência</label>
                    <input type="text" value={form.tempoExperiencia} onChange={set('tempoExperiencia')} placeholder="Ex: 5 anos" className={inp} />
                  </div>
                </div>
              </>
            )}

            {/* Segurança — paciente e farmacêutico */}
            <div className={sec}><Lock className="w-3.5 h-3.5" /> Segurança</div>
            <AlterarSenhaForm />

            {/* Consentimento — só paciente */}
            {!isFarm && (
              <>
                <div className={sec}><ClipboardList className="w-3.5 h-3.5" /> Consentimento Informado</div>
                <div className="bg-surface border border-line rounded-[10px] px-3 py-2.5 mb-1">
                  {/* Alerta de rascunho */}
                  <div className="flex items-start gap-1.5 bg-alert-wash border border-alert/30 rounded-md px-2 py-1.5 mb-2">
                    <TriangleAlert className="w-3 h-3 text-alert shrink-0 mt-0.5" />
                    <p className="text-[10px] text-alert m-0"><strong>Rascunho</strong> — texto pendente de validação jurídica. Não é definitivo.</p>
                  </div>
                  {consentInfo?.aceito ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-success font-semibold m-0 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Termo aceito
                      </p>
                      <p className="text-[11px] text-muted m-0">
                        Versão {consentInfo.versao} — {consentInfo.aceitoEm ? new Date(consentInfo.aceitoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-error font-semibold m-0 inline-flex items-center gap-1">
                        <TriangleAlert className="w-3.5 h-3.5" />
                        Pendente de aceite
                      </p>
                      <button
                        onClick={() => setShowTermoModal(true)}
                        className="px-2.5 py-1 bg-brand text-brand-contrast border-none rounded-md text-[11px] font-bold cursor-pointer"
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
                <div className={sec}><ShieldCheck className="w-3.5 h-3.5" /> Meus dados (LGPD)</div>
                <div className="flex flex-col gap-2 mb-2">
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
                    className={`w-full px-3 py-2.5 border border-line rounded-[10px] text-xs font-semibold text-ink bg-canvas text-left inline-flex items-center gap-1.5 disabled:opacity-70 ${downloadingDados ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    {downloadingDados ? <Hourglass className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    {downloadingDados ? 'Exportando...' : 'Baixar meus dados (JSON)'}
                  </button>
                  <button
                    onClick={() => setShowExcluirModal(true)}
                    className="w-full px-3 py-2.5 border border-error/30 rounded-[10px] text-xs font-semibold text-error bg-error-wash text-left cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir minha conta
                  </button>
                </div>
              </>
            )}

            <div className="h-4" />
          </>
        )}
      </div>
    </Modal>

    {/* Modais — fora do modal principal */}
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

export default PerfilModal;
