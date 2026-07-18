import React, { useState, useCallback, useEffect } from 'react';
import {
  LayoutDashboard, Clock, Stethoscope, Users, CalendarClock, Star,
  ScrollText, Wallet, Banknote, Mail, Handshake, ShieldCheck,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuthedFetch } from '../hooks/useAuthedFetch';
import { useToast } from '../hooks/useToast';
import { useDownloadCsv } from '../hooks/useDownloadCsv';
import { useFinanceiroAdmin } from '../hooks/useFinanceiroAdmin';
import Toast from './ui/Toast';
import OverviewTab from './admin/OverviewTab';
import HorariosTab from './admin/HorariosTab';
import PharmacistsTab from './admin/PharmacistsTab';
import PatientsTab from './admin/PatientsTab';
import ConsultasTab from './admin/ConsultasTab';
import AvaliacoesAdminTab from './admin/AvaliacoesAdminTab';
import LogsTabContainer from './admin/LogsTabContainer';
import FinanceiroTab from './admin/FinanceiroTab';
import RepassesTab from './admin/RepassesTab';
import ConvitesTab from './admin/ConvitesTab';
import ParceirosTab from './admin/ParceirosTab';
import AdminsTab from './admin/AdminsTab';
import { getPharmacistStatus } from '../utils/pharmacistFormat';

const AdminPanel = () => {
  const { token, user } = useAuth();
  const currentUserEmail = (user?.email || '').toLowerCase();
  const api = useAuthedFetch(token);
  const { toast, showToast } = useToast();
  const downloadCsv = useDownloadCsv(api, showToast);

  const [tab, setTab] = useState('overview');
  const [pharmacists, setPharmacists] = useState([]);
  const [patients, setPatients]       = useState([]);

  // finLimiteOcorrencias também é usado pela aba Farmacêuticos (badge de
  // alerta) — por isso a config financeira é carregada aqui, no painel, e não
  // dentro da própria aba Financeiro (ver comentário no hook).
  const finHook = useFinanceiroAdmin(api, showToast);

  const loadDirectory = useCallback(async () => {
    const [pRes, patRes] = await Promise.all([
      api('/api/admin/pharmacists'),
      api('/api/admin/patients'),
    ]);
    if (pRes.ok)   { const pd = await pRes.json(); setPharmacists(pd.data ?? []); }
    if (patRes.ok) { const patd = await patRes.json(); setPatients(patd.data ?? []); }
  }, [api]);

  useEffect(() => { loadDirectory(); }, [loadDirectory]);

  const pendentesCount = pharmacists.filter(
    (p) => getPharmacistStatus(p.pharmacistProfile).key === 'pendente'
  ).length;

  const TABS = [
    { id: 'overview',     label: 'Visão geral', icon: LayoutDashboard },
    { id: 'horarios',     label: 'Horários', icon: Clock },
    { id: 'consultas',    label: 'Consultas', icon: CalendarClock },
    { id: 'pharmacists',  label: `Farmacêuticos (${pharmacists.length})`, icon: Stethoscope, badge: pendentesCount },
    { id: 'patients',     label: `Pacientes (${patients.length})`, icon: Users },
    { id: 'avaliacoes',   label: 'Avaliações', icon: Star },
    { id: 'financeiro',   label: 'Financeiro', icon: Wallet },
    { id: 'repasses',     label: 'Repasses', icon: Banknote },
    { id: 'convites',     label: 'Convites', icon: Mail },
    { id: 'parceiros',    label: 'Parceiros', icon: Handshake },
    { id: 'admins',       label: 'Admins', icon: ShieldCheck },
    { id: 'logs',         label: 'Logs', icon: ScrollText },
  ];

  const TAB_GROUPS = [
    { label: 'Operação',   ids: ['overview', 'horarios', 'consultas'] },
    { label: 'Pessoas',    ids: ['pharmacists', 'patients', 'avaliacoes'] },
    { label: 'Financeiro', ids: ['financeiro', 'repasses'] },
    { label: 'Sistema',    ids: ['convites', 'parceiros', 'admins', 'logs'] },
  ];

  const tabById = Object.fromEntries(TABS.map((t) => [t.id, t]));

  return (
    <div>
      {/* Toast */}
      {toast && (
        <Toast variant={toast.type === 'success' ? 'success' : 'error'}>
          <span className="inline-flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.text}
          </span>
        </Toast>
      )}

      <div className="lg:flex lg:gap-8 lg:items-start">
        {/* Nav — mobile: select agrupado */}
        <div className="lg:hidden mb-5">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            aria-label="Selecionar seção do painel administrativo"
            className="w-full border border-line rounded-xl px-3 py-2.5 text-sm font-medium text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {TAB_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.ids.map((id) => {
                  const { label, badge } = tabById[id];
                  return (
                    <option key={id} value={id}>
                      {badge > 0 ? `${label} · ${badge} pendente(s)` : label}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Nav — desktop: sidebar agrupada */}
        <nav className="hidden lg:block lg:w-56 shrink-0 space-y-5 sticky top-4">
          {TAB_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[11px] font-bold text-muted uppercase tracking-wide">{group.label}</p>
              <div className="space-y-0.5">
                {group.ids.map((id) => {
                  const t = tabById[id];
                  const Icon = t.icon;
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition ${
                        active
                          ? 'bg-brand-wash text-brand-deep font-semibold'
                          : 'text-muted hover:bg-surface hover:text-ink font-medium'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{t.label}</span>
                      {t.badge > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-alert text-white text-[10px] font-bold">
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {tab === 'overview'    && <OverviewTab api={api} showToast={showToast} />}
          {tab === 'horarios'    && <HorariosTab api={api} showToast={showToast} />}
          {tab === 'pharmacists' && (
            <PharmacistsTab
              api={api} showToast={showToast}
              pharmacists={pharmacists} setPharmacists={setPharmacists}
              finLimiteOcorrencias={finHook.finLimiteOcorrencias}
            />
          )}
          {tab === 'patients'    && (
            <PatientsTab api={api} showToast={showToast} patients={patients} setPatients={setPatients} />
          )}
          {tab === 'consultas'   && <ConsultasTab api={api} />}
          {tab === 'avaliacoes'  && <AvaliacoesAdminTab api={api} pharmacists={pharmacists} />}
          {tab === 'logs'        && <LogsTabContainer api={api} pharmacists={pharmacists} patients={patients} />}
          {tab === 'financeiro'  && <FinanceiroTab api={api} downloadCsv={downloadCsv} {...finHook} />}
          {tab === 'repasses'    && (
            <RepassesTab api={api} showToast={showToast} pharmacists={pharmacists} downloadCsv={downloadCsv} />
          )}
          {tab === 'convites'    && <ConvitesTab api={api} showToast={showToast} />}
          {tab === 'parceiros'   && <ParceirosTab api={api} showToast={showToast} />}
          {tab === 'admins'      && <AdminsTab api={api} showToast={showToast} currentUserEmail={currentUserEmail} />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
