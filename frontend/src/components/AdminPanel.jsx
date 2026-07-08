import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuthedFetch } from '../hooks/useAuthedFetch';
import { useToast } from '../hooks/useToast';
import { useDownloadCsv } from '../hooks/useDownloadCsv';
import { useFinanceiroAdmin } from '../hooks/useFinanceiroAdmin';
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

  const TABS = [
    { id: 'overview',     label: 'Visão geral' },
    { id: 'horarios',     label: 'Horários' },
    { id: 'pharmacists',  label: `Farmacêuticos (${pharmacists.length})` },
    { id: 'patients',     label: `Pacientes (${patients.length})` },
    { id: 'consultas',    label: 'Consultas' },
    { id: 'avaliacoes',   label: '⭐ Avaliações' },
    { id: 'logs',         label: 'Logs' },
    { id: 'financeiro',   label: '💰 Financeiro' },
    { id: 'repasses',     label: '💳 Repasses' },
    { id: 'convites',     label: '✉️ Convites' },
    { id: 'parceiros',    label: '🤝 Parceiros' },
    { id: 'admins',       label: '🔐 Admins' },
  ];

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.text}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
              tab === t.id
                ? 'border-brand text-brand-deep'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
  );
};

export default AdminPanel;
