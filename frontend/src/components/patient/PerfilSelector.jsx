import React from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEP_COLORS, initials } from '../../utils/patientDashboardFormat';
import CadastroDependenteModal from './CadastroDependenteModal';

const PerfilSelector = ({
  dependentes, selectedPerson, setSelectedPerson,
  confirmDeleteInDropdown, setConfirmDeleteInDropdown,
  showCadastroModal, setShowCadastroModal,
  cadastroForm, setCadastroForm,
  cadastroLoading, cadastroError, setCadastroError,
  cadastroFieldErrors, setCadastroFieldErrors,
  handleDeleteDependente, handleCadastroDependente,
  podeAdicionarMais,
}) => {
  const { user } = useAuth();

  const chipBase = 'shrink-0 flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 text-sm font-semibold transition border';

  return (
    <>
      <div role="tablist" aria-label="Perfis" className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {/* Titular */}
        <button
          role="tab"
          aria-selected={selectedPerson === null}
          onClick={() => setSelectedPerson(null)}
          className={`${chipBase} ${selectedPerson === null ? 'bg-brand-wash border-brand text-brand-deep' : 'bg-canvas border-line text-ink hover:border-brand/50'}`}
        >
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center text-[10px] font-bold text-white">
            {initials(user?.name || '')}
          </span>
          Você
        </button>

        {/* Dependentes */}
        {dependentes.map((dep, idx) => {
          const isSelected = selectedPerson?.id === dep.id;
          const isConfirming = confirmDeleteInDropdown === dep.id;
          const depGradient = DEP_COLORS[idx % DEP_COLORS.length];

          if (isConfirming) {
            return (
              <div key={dep.id} className="shrink-0 flex items-center gap-2 rounded-full border border-error bg-error-wash pl-3 pr-1.5 py-1.5 text-sm">
                <span className="font-semibold text-error whitespace-nowrap">Excluir {dep.nome.split(' ')[0]}?</span>
                <button
                  onClick={() => setConfirmDeleteInDropdown(null)}
                  className="text-xs font-semibold text-muted px-2 py-1 rounded-full bg-canvas border border-line"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteDependente(dep.id)}
                  className="text-xs font-bold text-error-contrast px-2 py-1 rounded-full bg-error"
                >
                  Excluir
                </button>
              </div>
            );
          }

          return (
            <div key={dep.id} className="relative shrink-0 group">
              <button
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedPerson(dep)}
                className={`${chipBase} ${isSelected ? 'bg-brand-wash border-brand text-brand-deep' : 'bg-canvas border-line text-ink hover:border-brand/50'}`}
              >
                <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${depGradient} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {initials(dep.nome)}
                </span>
                {dep.nome.split(' ')[0]}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteInDropdown(dep.id); }}
                aria-label={`Excluir ${dep.nome}`}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-canvas border border-line text-muted flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
              >
                <X className="w-2.5 h-2.5" strokeWidth={3} />
              </button>
            </div>
          );
        })}

        {/* Adicionar dependente */}
        <button
          onClick={() => {
            setCadastroError('');
            setCadastroForm({ nome: '', dataNascimento: '', sexo: '', parentesco: '', aceito: false });
            setShowCadastroModal(true);
          }}
          disabled={!podeAdicionarMais}
          className={`${chipBase} border-dashed ${podeAdicionarMais ? 'border-line text-brand-deep hover:border-brand' : 'border-line text-muted cursor-not-allowed opacity-60'}`}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          {podeAdicionarMais ? 'Adicionar' : 'Limite atingido'}
        </button>
      </div>

      {showCadastroModal && (
        <CadastroDependenteModal
          cadastroForm={cadastroForm} setCadastroForm={setCadastroForm}
          cadastroLoading={cadastroLoading} cadastroError={cadastroError} setCadastroError={setCadastroError}
          cadastroFieldErrors={cadastroFieldErrors} setCadastroFieldErrors={setCadastroFieldErrors}
          handleCadastroDependente={handleCadastroDependente}
          onClose={() => { setShowCadastroModal(false); setCadastroFieldErrors({ nome: '', data: '' }); }}
        />
      )}
    </>
  );
};

export default PerfilSelector;
