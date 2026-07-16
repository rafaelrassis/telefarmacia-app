import React, { useState } from 'react';
import { FileText, CheckCircle2, RotateCcw, Ban, UserX, Trash2, TriangleAlert } from 'lucide-react';
import Modal from '../ui/Modal';
import OcorrenciasModal from './OcorrenciasModal';
import DocumentoViewerModal from './DocumentoViewerModal';
import { fmt } from '../../utils/adminFormat';
import { getPharmacistStatus } from '../../utils/pharmacistFormat';

const STATUS_BADGE_CLS = {
  suspenso: 'bg-error-wash text-error',
  ativo:    'bg-success-wash text-success',
  pendente: 'bg-alert-wash text-alert',
};
const STATUS_BADGE_LABEL = { suspenso: 'Suspenso', ativo: 'Ativo', pendente: 'Pendente' };

// Diálogo de confirmação compartilhado pelas 3 ações destrutivas desta aba
// (suspender / inativar / descadastrar) — mesmo conteúdo/ações de antes, só
// unificadas no Modal do design system com o padrão visual botão error.
const ConfirmPowerAction = ({ title, name, message, alertText, confirmLabel, confirmingLabel, loading, onCancel, onConfirm }) => (
  <Modal
    title={title}
    onClose={onCancel}
    maxWidth="max-w-sm"
    footer={(
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 text-sm font-medium border border-line rounded-xl hover:bg-surface transition text-ink"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-bold bg-error text-white rounded-xl hover:bg-error/90 disabled:opacity-60 transition"
        >
          {loading ? confirmingLabel : confirmLabel}
        </button>
      </div>
    )}
  >
    <div className="px-6 pt-4 pb-2">
      <p className="text-sm text-ink mb-3">
        <strong>{name}</strong> {message}
      </p>
      {alertText && (
        <div className="flex items-start gap-1.5 bg-alert-wash border border-alert/30 rounded-lg px-3 py-2">
          <TriangleAlert className="w-3.5 h-3.5 text-alert shrink-0 mt-0.5" />
          <p className="text-xs text-alert font-semibold leading-snug m-0">{alertText}</p>
        </div>
      )}
    </div>
  </Modal>
);

const PharmacistsTab = ({ api, showToast, pharmacists, setPharmacists, finLimiteOcorrencias }) => {
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [confirmSuspend, setConfirmSuspend] = useState(null);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [viewingOcorrencias, setViewingOcorrencias] = useState(null);
  const [viewingDocs, setViewingDocs] = useState(null);

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
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        {pharmacists.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Nenhum farmacêutico cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
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
              <tbody className="divide-y divide-line">
                {pharmacists.map((p) => {
                  const prof       = p.pharmacistProfile;
                  const status     = getPharmacistStatus(prof);
                  return (
                    <tr key={p.id} className="hover:bg-surface transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-muted">{p.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {prof ? `${prof.crfNumber}/${prof.crfUF}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {prof?.urlDocIdentidade ? (
                          <button
                            onClick={() => setViewingDocs(p)}
                            className="inline-flex items-center gap-1 text-xs text-brand-deep hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ver documentos
                          </button>
                        ) : (
                          <span className="text-xs text-muted">Não enviado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink">
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
                                alerta ? 'bg-alert-wash text-alert hover:bg-alert/20' : 'bg-surface text-muted hover:bg-line'
                              }`}
                            >
                              {oc}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">{fmt(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLS[status.key]}`}>
                          {STATUS_BADGE_LABEL[status.key]}
                        </span>
                        {prof?.chavePix && (
                          <p className="text-[10px] text-muted mt-1">PIX: {prof.chavePix}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {status.key === 'suspenso' ? (
                            <button
                              onClick={() => handleReativar(p.id)}
                              disabled={actionLoading[p.id + '_reat']}
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-success hover:bg-success/90 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {actionLoading[p.id + '_reat'] ? '...' : 'Reativar'}
                            </button>
                          ) : status.key === 'ativo' ? (
                            <>
                              <button
                                onClick={() => setConfirmSuspend(p)}
                                className="inline-flex items-center gap-1 text-xs font-semibold bg-error hover:bg-error/90 text-white px-3 py-1.5 rounded-lg transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Suspender
                              </button>
                              <button
                                onClick={() => setConfirmRevoke(p)}
                                disabled={actionLoading[p.id + '_rev']}
                                className="inline-flex items-center gap-1 text-xs font-semibold bg-error/80 hover:bg-error text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                {actionLoading[p.id + '_rev'] ? '...' : 'Inativar'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => activate(p.id)}
                              disabled={actionLoading[p.id]}
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-success hover:bg-success/90 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {actionLoading[p.id] ? '...' : 'Ativar'}
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(p)}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-error hover:bg-error/90 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <ConfirmPowerAction
          title="Inativar farmacêutico?"
          name={confirmRevoke.name}
          message="será inativado e não poderá realizar atendimentos."
          alertText="Todas as consultas futuras agendadas com este profissional serão canceladas automaticamente. Os pacientes afetados serão notificados por e-mail."
          confirmLabel="Inativar"
          confirmingLabel="Inativando..."
          loading={actionLoading[confirmRevoke.id + '_rev']}
          onCancel={() => setConfirmRevoke(null)}
          onConfirm={() => revokeConfirmed(confirmRevoke.id)}
        />
      )}

      {/* Dialog: confirmar suspensão */}
      {confirmSuspend && (
        <ConfirmPowerAction
          title="Suspender farmacêutico?"
          name={confirmSuspend.name}
          message="deixará de receber novas consultas imediatamente."
          alertText="Consultas agendadas futuras serão canceladas e os pacientes notificados."
          confirmLabel="Confirmar"
          confirmingLabel="Suspendendo..."
          loading={suspendLoading}
          onCancel={() => setConfirmSuspend(null)}
          onConfirm={() => handleSuspender(confirmSuspend.id)}
        />
      )}

      {/* Dialog: confirmar exclusão */}
      {confirmDelete && (
        <ConfirmPowerAction
          title="Descadastrar farmacêutico?"
          name={confirmDelete.name}
          message="perderá o perfil de farmacêutico e seus horários futuros serão removidos."
          alertText="Consultas futuras serão canceladas e os pacientes notificados. O histórico é preservado."
          confirmLabel="Confirmar"
          confirmingLabel="Removendo..."
          loading={actionLoading[confirmDelete.id + '_del']}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteFarm(confirmDelete.id)}
        />
      )}

      {viewingOcorrencias && (
        <OcorrenciasModal
          api={api}
          farmaceutico={viewingOcorrencias}
          onClose={() => setViewingOcorrencias(null)}
        />
      )}

      {viewingDocs && (
        <DocumentoViewerModal
          farmaceutico={viewingDocs}
          onClose={() => setViewingDocs(null)}
        />
      )}
    </>
  );
};

export default PharmacistsTab;
