import React, { useState } from 'react';
import { Wallet, Trash2 } from 'lucide-react';
import AjusteCarteiraModal from './AjusteCarteiraModal';
import ConfirmPowerAction from './ConfirmPowerAction';
import { fmt } from '../../utils/adminFormat';

const PatientsTab = ({ api, showToast, patients, setPatients }) => {
  const [ajustandoCarteira, setAjustandoCarteira] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (p) => {
    setDeleting(true);
    try {
      const res = await api(`/api/admin/pacientes/${p.id}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('success', d.message || 'Paciente excluído.');
        setPatients((prev) => prev.filter((x) => x.id !== p.id));
      } else {
        showToast('error', d.error || 'Erro ao excluir paciente.');
      }
    } catch {
      showToast('error', 'Falha de conexão.');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        {patients.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Nenhum paciente cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Consultas</th>
                  <th className="text-left px-4 py-3">Saldo</th>
                  <th className="text-left px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-surface transition">
                    <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                    <td className="px-4 py-3 text-muted">{p.email}</td>
                    <td className="px-4 py-3 text-ink">{p.consultasCount ?? 0}</td>
                    <td className="px-4 py-3 text-ink font-medium">
                      R$ {(p.saldo ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{fmt(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAjustandoCarteira(p)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold border border-brand/30 text-brand-deep hover:bg-brand-wash px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Ajustar saldo
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold border border-error/30 text-error hover:bg-error-wash px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ajustandoCarteira && (
        <AjusteCarteiraModal
          api={api}
          paciente={ajustandoCarteira}
          showToast={showToast}
          onClose={() => setAjustandoCarteira(null)}
          onSuccess={(pacienteId, novoSaldo) => {
            setPatients((prev) => prev.map((p) => (p.id === pacienteId ? { ...p, saldo: novoSaldo } : p)));
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmPowerAction
          title="Excluir paciente?"
          name={confirmDelete.name}
          message="será removido da plataforma."
          alertText={
            (confirmDelete.consultasCount ?? 0) > 0
              ? 'Este paciente possui histórico de consultas: a conta será anonimizada e os registros clínicos mantidos conforme prazo legal.'
              : 'Esta conta não possui consultas e será excluída definitivamente. Esta ação não pode ser desfeita.'
          }
          confirmLabel="Confirmar"
          confirmingLabel="Excluindo..."
          loading={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
};

export default PatientsTab;
