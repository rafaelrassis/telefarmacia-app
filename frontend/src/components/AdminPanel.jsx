import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const DEFAULT_HORARIOS = DIAS_SEMANA.map((_, i) => ({
  diaSemana: i,
  horaInicio: '08:00',
  horaFim: '18:00',
  ativo: i >= 1 && i <= 5,
}));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_LABEL = {
  AGENDADO:           { label: 'Agendado',           cls: 'bg-blue-50 text-blue-700' },
  CONCLUIDO:          { label: 'Concluído',           cls: 'bg-green-50 text-green-700' },
  CANCELADO:          { label: 'Cancelado',           cls: 'bg-red-50 text-red-700' },
  PENDENTE_PAGAMENTO: { label: 'Pend. pagamento',     cls: 'bg-yellow-50 text-yellow-700' },
  EXPIRADA:           { label: 'Expirada',            cls: 'bg-gray-100 text-gray-500' },
};

const fmt   = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const fmtDt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const StatCard = ({ value, label, sub, color = 'text-gray-900' }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const AdminPanel = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState('overview');
  const [metricas, setMetricas]       = useState(null);
  const [pharmacists, setPharmacists] = useState([]);
  const [patients, setPatients]       = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [toast, setToast] = useState(null);
  const [sistemaAberto, setSistemaAberto] = useState(null);
  const [togglingSistema, setTogglingSistema] = useState(false);
  const [horarios, setHorarios] = useState(DEFAULT_HORARIOS);
  const [savingHorarios, setSavingHorarios] = useState(false);

  const api = useCallback(
    (path, opts = {}) =>
      fetch(`${API_URL}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
      }),
    [token]
  );

  const load = useCallback(async () => {
    const [mRes, pRes, patRes, aRes, sRes, hRes] = await Promise.all([
      api('/api/admin/metricas'),
      api('/api/admin/pharmacists'),
      api('/api/admin/patients'),
      api('/api/admin/appointments'),
      fetch(`${API_URL}/api/sistema/status`),
      api('/api/admin/horarios'),
    ]);
    if (mRes.ok)   setMetricas(await mRes.json());
    if (pRes.ok)   setPharmacists(await pRes.json());
    if (patRes.ok) setPatients(await patRes.json());
    if (aRes.ok)   setAppointments(await aRes.json());
    if (sRes.ok)   { const sd = await sRes.json(); setSistemaAberto(sd.sistema_aberto); }
    if (hRes.ok) {
      const h = await hRes.json();
      if (h.length > 0) {
        // Mescla com defaults para garantir os 7 dias
        setHorarios(DEFAULT_HORARIOS.map((def) => {
          const saved = h.find((x) => x.diaSemana === def.diaSemana);
          return saved ? { ...def, ...saved } : def;
        }));
      }
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const setBtnLoading = (key, v) => setActionLoading((prev) => ({ ...prev, [key]: v }));

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const activate = async (userId) => {
    setBtnLoading(userId, true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: 'Ativo' }),
      });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: true } } : p
        ));
        showToast('success', data.message || 'Farmacêutico ativado.');
      } else {
        showToast('error', data.error || 'Erro ao ativar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setBtnLoading(userId, false); }
  };

  const revokeConfirmed = async (userId) => {
    setBtnLoading(userId + '_rev', true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: 'Inativo' }),
      });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: false } } : p
        ));
        showToast('success', data.message || 'Farmacêutico inativado.');
      } else {
        showToast('error', data.error || 'Erro ao inativar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setBtnLoading(userId + '_rev', false); setConfirmRevoke(null); }
  };

  const handleToggleSistema = async () => {
    setTogglingSistema(true);
    try {
      const res  = await api('/api/admin/sistema', {
        method: 'PATCH', body: JSON.stringify({ aberto: !sistemaAberto }),
      });
      const data = await res.json();
      if (res.ok) {
        setSistemaAberto(data.sistema_aberto);
        showToast('success', data.sistema_aberto ? 'Sistema aberto para agendamentos.' : 'Sistema fechado.');
      } else {
        showToast('error', data.error || 'Erro ao alterar status do sistema.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setTogglingSistema(false); }
  };

  const deleteFarm = async (userId) => {
    setBtnLoading(userId + '_del', true);
    try {
      const res  = await api(`/api/admin/pharmacists/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.filter((p) => p.id !== userId));
        showToast('success', data.message || 'Farmacêutico descadastrado.');
      } else {
        showToast('error', data.error || 'Erro ao descadastrar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setBtnLoading(userId + '_del', false); setConfirmDelete(null); }
  };

  const handleSaveHorarios = async () => {
    setSavingHorarios(true);
    try {
      const res  = await api('/api/admin/horarios', {
        method: 'PUT', body: JSON.stringify({ horarios }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Horários salvos com sucesso.');
      } else {
        showToast('error', data.error || 'Erro ao salvar horários.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally  { setSavingHorarios(false); }
  };

  const updateHorario = (diaSemana, field, value) => {
    setHorarios((prev) =>
      prev.map((h) => h.diaSemana === diaSemana ? { ...h, [field]: value } : h)
    );
  };

  const TABS = [
    { id: 'overview',     label: 'Visão geral' },
    { id: 'horarios',     label: 'Horários' },
    { id: 'pharmacists',  label: `Farmacêuticos (${pharmacists.length})` },
    { id: 'patients',     label: `Pacientes (${patients.length})` },
    { id: 'appointments', label: `Consultas (${appointments.length})` },
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
                ? 'border-violet-700 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Sistema de agendamentos */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Sistema de Agendamentos</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {sistemaAberto === null
                  ? 'Carregando status...'
                  : sistemaAberto
                    ? 'Aberto — pacientes podem realizar agendamentos.'
                    : 'Fechado — agendamentos estão suspensos para todos os pacientes.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold ${sistemaAberto ? 'text-emerald-600' : 'text-red-500'}`}>
                {togglingSistema ? '...' : sistemaAberto ? 'Aberto' : 'Fechado'}
              </span>
              <button
                onClick={handleToggleSistema}
                disabled={sistemaAberto === null || togglingSistema}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  sistemaAberto ? 'bg-emerald-500' : 'bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    sistemaAberto ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {metricas ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard value={metricas.usuarios_ativos?.pacientes}     label="Pacientes"             color="text-blue-600" />
                <StatCard value={metricas.usuarios_ativos?.farmaceuticos} label="Farmacêuticos ativos"  color="text-violet-600" />
                <StatCard value={metricas.consultas_realizadas}           label="Consultas realizadas"  color="text-green-600" />
                <StatCard value={metricas.consultas_agendadas}            label="Agendadas"             color="text-blue-500" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard value={metricas.consultas_canceladas}    label="Canceladas"               color="text-red-500" />
                <StatCard
                  value={metricas.farmaceuticos_pendentes}
                  label="Aguardando aprovação"
                  color={metricas.farmaceuticos_pendentes > 0 ? 'text-amber-600' : 'text-gray-400'}
                  sub={metricas.farmaceuticos_pendentes > 0 ? 'Vá em Farmacêuticos para aprovar' : undefined}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                  <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-24" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HORÁRIOS DO SISTEMA ── */}
      {tab === 'horarios' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Horários de funcionamento</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Define os dias e horários em que os pacientes podem agendar consultas.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {horarios.map((h) => (
                <div key={h.diaSemana} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium text-gray-700">{DIAS_SEMANA[h.diaSemana]}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <div
                      onClick={() => updateHorario(h.diaSemana, 'ativo', !h.ativo)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                        h.ativo ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        h.ativo ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className={`text-xs font-medium ${h.ativo ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {h.ativo ? 'Ativo' : 'Fechado'}
                    </span>
                  </label>
                  {h.ativo && (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={h.horaInicio}
                        onChange={(e) => updateHorario(h.diaSemana, 'horaInicio', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      <span className="text-gray-400 text-xs">até</span>
                      <input
                        type="time"
                        value={h.horaFim}
                        onChange={(e) => updateHorario(h.diaSemana, 'horaFim', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSaveHorarios}
                disabled={savingHorarios}
                className="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {savingHorarios ? 'Salvando...' : 'Salvar horários'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FARMACÊUTICOS ── */}
      {tab === 'pharmacists' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {pharmacists.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhum farmacêutico cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nome / E-mail</th>
                    <th className="text-left px-4 py-3">CRF</th>
                    <th className="text-left px-4 py-3">Documentos</th>
                    <th className="text-left px-4 py-3">Consultas</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pharmacists.map((p) => {
                    const prof    = p.pharmacistProfile;
                    const approved = prof?.isApproved;
                    const docBase  = API_URL;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {prof ? `${prof.crfNumber}/${prof.crfUF}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {prof?.urlDocIdentidade ? (
                            <div className="flex flex-col gap-1">
                              <a href={`${docBase}${prof.urlDocIdentidade}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-violet-600 hover:underline">RG/CNH</a>
                              <a href={`${docBase}${prof.urlDocCrf}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-violet-600 hover:underline">CRF</a>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Não enviado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {p._count?.appointmentsAsPharmacist ?? 0}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {approved ? 'Ativo' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {approved ? (
                              <button
                                onClick={() => setConfirmRevoke(p)}
                                disabled={actionLoading[p.id + '_rev']}
                                className="text-xs font-medium text-amber-600 hover:text-amber-800 disabled:opacity-40 transition"
                              >
                                {actionLoading[p.id + '_rev'] ? '...' : 'Inativar'}
                              </button>
                            ) : (
                              <button
                                onClick={() => activate(p.id)}
                                disabled={actionLoading[p.id]}
                                className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-40 transition"
                              >
                                {actionLoading[p.id] ? '...' : 'Ativar'}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete(p)}
                              className="text-xs font-medium text-red-500 hover:text-red-700 transition"
                            >
                              Descadastrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PACIENTES ── */}
      {tab === 'patients' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {patients.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhum paciente cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">E-mail</th>
                    <th className="text-left px-4 py-3">Consultas</th>
                    <th className="text-left px-4 py-3">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.email}</td>
                      <td className="px-4 py-3 text-gray-600">{p._count?.appointmentsAsPatient ?? 0}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CONSULTAS ── */}
      {tab === 'appointments' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhuma consulta registrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Paciente</th>
                    <th className="text-left px-4 py-3">Farmacêutico</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.map((a) => {
                    const cfg = STATUS_LABEL[a.status] || { label: a.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{a.patient?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{a.patient?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{a.pharmacist?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{a.pharmacist?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDt(a.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dialog: confirmar inativação */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmRevoke(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Inativar farmacêutico?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{confirmRevoke.name}</strong> será inativado e não poderá realizar atendimentos.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5 mt-3">
              <p className="text-xs text-amber-800 font-semibold">
                ⚠️ Todas as consultas futuras agendadas com este profissional serão <strong>canceladas automaticamente</strong>.
                Os pacientes afetados serão notificados por e-mail.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => revokeConfirmed(confirmRevoke.id)}
                disabled={actionLoading[confirmRevoke.id + '_rev']}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-60 transition"
              >
                {actionLoading[confirmRevoke.id + '_rev'] ? 'Inativando...' : 'Inativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Descadastrar farmacêutico?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{confirmDelete.name}</strong> perderá o perfil de farmacêutico e seus horários futuros serão removidos.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-5 mt-3">
              <p className="text-xs text-red-800 font-semibold">
                ⚠️ Consultas futuras serão canceladas e os pacientes notificados. O histórico é preservado.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteFarm(confirmDelete.id)}
                disabled={actionLoading[confirmDelete.id + '_del']}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition"
              >
                {actionLoading[confirmDelete.id + '_del'] ? 'Removendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
