import React, { useState } from 'react';
import AjusteCarteiraModal from './AjusteCarteiraModal';
import { fmt } from '../../utils/adminFormat';

const PatientsTab = ({ api, showToast, patients, setPatients }) => {
  const [ajustandoCarteira, setAjustandoCarteira] = useState(null);

  return (
    <>
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
                  <th className="text-left px-4 py-3">Saldo</th>
                  <th className="text-left px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.email}</td>
                    <td className="px-4 py-3 text-gray-600">{p.consultasCount ?? 0}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      R$ {(p.saldo ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setAjustandoCarteira(p)}
                        className="text-xs font-semibold border border-brand/30 text-brand-deep hover:bg-brand-wash px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                      >
                        Ajustar saldo
                      </button>
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
    </>
  );
};

export default PatientsTab;
