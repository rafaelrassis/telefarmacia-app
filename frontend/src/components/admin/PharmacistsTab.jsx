import React, { useState } from 'react';
import OcorrenciasModal from './OcorrenciasModal';
import { fmt } from '../../utils/adminFormat';
import { getPharmacistStatus } from '../../utils/pharmacistFormat';

const STATUS_BADGE_CLS = {
  suspenso: 'bg-red-50 text-red-700',
  ativo:    'bg-green-50 text-green-700',
  pendente: 'bg-amber-50 text-amber-700',
};
const STATUS_BADGE_LABEL = { suspenso: '🔴 Suspenso', ativo: 'Ativo', pendente: 'Pendente' };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PharmacistsTab = ({ api, showToast, pharmacists, setPharmacists, finLimiteOcorrencias }) => {
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [confirmSuspend, setConfirmSuspend] = useState(null);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [viewingOcorrencias, setViewingOcorrencias] = useState(null);

  const setBtnLoading = (key, v) => setActionLoading((prev) => ({ ...prev, [key]: v }));

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

  const handleSuspender = async (userId) => {
    setSuspendLoading(true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/suspender`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId
            ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: false, isSuspended: true } }
            : p
        ));
        showToast('success', data.message || 'Farmacêutico suspenso.');
      } else {
        showToast('error', data.error || 'Erro ao suspender.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setSuspendLoading(false); setConfirmSuspend(null); }
  };

  const handleReativar = async (userId) => {
    setBtnLoading(userId + '_reat', true);
    try {
      const res  = await api(`/api/admin/farmaceuticos/${userId}/reativar`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPharmacists((prev) => prev.map((p) =>
          p.id === userId
            ? { ...p, pharmacistProfile: { ...p.pharmacistProfile, isApproved: true, isSuspended: false } }
            : p
        ));
        showToast('success', data.message || 'Farmacêutico reativado.');
      } else {
        showToast('error', data.error || 'Erro ao reativar.');
      }
    } catch { showToast('error', 'Falha de conexão.'); }
    finally { setBtnLoading(userId + '_reat', false); }
  };

  return (
    <>
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
                  <th className="text-left px-4 py-3">Ocorrências (30d)</th>
                  <th className="text-left px-4 py-3">Cadastro</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pharmacists.map((p) => {
                  const prof       = p.pharmacistProfile;
                  const status     = getPharmacistStatus(prof);
                  const docBase    = API_URL;
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
                              className="text-xs text-brand-deep hover:underline">RG/CNH</a>
                            <a href={`${docBase}${prof.urlDocCrf}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-brand-deep hover:underline">CRF</a>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Não enviado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.consultasCount ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const oc = p.ocorrencias30d ?? 0;
                          const limite = parseInt(finLimiteOcorrencias, 10) || 5;
                          const alerta = oc >= limite;
                          return (
                            <button
                              onClick={() => setViewingOcorrencias(p)}
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full transition ${
                                alerta ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {oc}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLS[status.key]}`}>
                          {STATUS_BADGE_LABEL[status.key]}
                        </span>
                        {prof?.chavePix && (
                          <p className="text-[10px] text-gray-400 mt-1">PIX: {prof.chavePix}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {status.key === 'suspenso' ? (
                            <button
                              onClick={() => handleReativar(p.id)}
                              disabled={actionLoading[p.id + '_reat']}
                              className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                            >
                              {actionLoading[p.id + '_reat'] ? '...' : 'Reativar'}
                            </button>
                          ) : status.key === 'ativo' ? (
                            <>
                              <button
                                onClick={() => setConfirmSuspend(p)}
                                className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition"
                              >
                                Suspender
                              </button>
                              <button
                                onClick={() => setConfirmRevoke(p)}
                                disabled={actionLoading[p.id + '_rev']}
                                className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                              >
                                {actionLoading[p.id + '_rev'] ? '...' : 'Inativar'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => activate(p.id)}
                              disabled={actionLoading[p.id]}
                              className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                            >
                              {actionLoading[p.id] ? '...' : 'Ativar'}
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(p)}
                            className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
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

      {/* Dialog: confirmar suspensão */}
      {confirmSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmSuspend(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Suspender farmacêutico?</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{confirmSuspend.name}</strong> deixará de receber novas consultas imediatamente.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-5 mt-3">
              <p className="text-xs text-orange-800 font-semibold">
                ⚠️ Consultas agendadas futuras serão canceladas e os pacientes notificados.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSuspend(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={() => handleSuspender(confirmSuspend.id)}
                disabled={suspendLoading}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-60 transition">
                {suspendLoading ? 'Suspendendo...' : 'Confirmar'}
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

      {viewingOcorrencias && (
        <OcorrenciasModal
          api={api}
          farmaceutico={viewingOcorrencias}
          onClose={() => setViewingOcorrencias(null)}
        />
      )}
    </>
  );
};

export default PharmacistsTab;
