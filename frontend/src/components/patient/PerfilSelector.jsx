import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatIdade } from '../../utils/formatIdade.js';
import { DEP_COLORS, initials, PARENTESCO_LABEL, EMPTY_CADASTRO } from '../../utils/patientDashboardFormat';
import CadastroDependenteModal from './CadastroDependenteModal';

const PerfilSelector = ({
  dependentes, selectedPerson, setSelectedPerson,
  dropdownOpen, setDropdownOpen,
  confirmDeleteInDropdown, setConfirmDeleteInDropdown,
  showCadastroModal, setShowCadastroModal,
  cadastroForm, setCadastroForm,
  cadastroLoading, cadastroError, setCadastroError,
  cadastroFieldErrors, setCadastroFieldErrors,
  dropdownRef,
  handleDeleteDependente, handleCadastroDependente,
  podeAdicionarMais,
}) => {
  const { user } = useAuth();

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Trigger */}
        <button
          onClick={() => { setDropdownOpen(o => !o); setConfirmDeleteInDropdown(null); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: 'white',
            border: dropdownOpen ? '1.5px solid #3B9FE0' : '1.5px solid #e5e7eb',
            borderRadius: dropdownOpen ? '10px 10px 0 0' : 10,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {/* Avatar */}
          <span style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: selectedPerson
              ? `linear-gradient(135deg, ${DEP_COLORS[dependentes.findIndex(d => d.id === selectedPerson.id) % DEP_COLORS.length].replace('from-', '').replace(' to-', ',')})`
              : 'linear-gradient(135deg, #3B9FE0, #1D74B8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white',
          }}>
            {initials(selectedPerson ? selectedPerson.nome : (user?.name || ''))}
          </span>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedPerson ? selectedPerson.nome : (user?.name || 'Minha conta')}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedPerson
                ? [PARENTESCO_LABEL[selectedPerson.parentesco], formatIdade(selectedPerson.dataNascimento)].filter(Boolean).join(' · ')
                : 'Titular da conta'}
            </p>
          </div>

          {/* Chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg" width={16} height={16} fill="none"
            viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2.5}
            style={{ flexShrink: 0, transition: 'transform 0.15s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Painel suspenso */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'white', border: '1.5px solid #3B9FE0', borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            overflow: 'hidden',
          }}>
            {/* Lista com scroll */}
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>

              {/* Linha do titular */}
              <button
                onClick={() => { setSelectedPerson(null); setDropdownOpen(false); setConfirmDeleteInDropdown(null); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', border: 'none', background: selectedPerson === null ? '#EAF6FE' : 'white',
                  cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #3B9FE0, #1D74B8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'white',
                }}>
                  {initials(user?.name || '')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{user?.name || 'Minha conta'}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Titular da conta</p>
                </div>
                {selectedPerson === null && (
                  <span style={{ fontSize: 15, color: '#3B9FE0', fontWeight: 700, flexShrink: 0 }}>✓</span>
                )}
              </button>

              {/* Linhas de dependentes */}
              {dependentes.map((dep, idx) => {
                const isSelected = selectedPerson?.id === dep.id;
                const isConfirming = confirmDeleteInDropdown === dep.id;
                const depColor = `linear-gradient(135deg, ${DEP_COLORS[idx % DEP_COLORS.length].replace('from-', '').replace(' to-', ',')})`;
                const idadeStr = formatIdade(dep.dataNascimento);
                const subtitulo = [PARENTESCO_LABEL[dep.parentesco], idadeStr].filter(Boolean).join(' · ');

                if (isConfirming) {
                  return (
                    <div key={dep.id} style={{
                      padding: '10px 14px', background: '#fef2f2',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
                        Excluir {dep.nome.split(' ')[0]}?
                      </span>
                      <button
                        onClick={() => setConfirmDeleteInDropdown(null)}
                        style={{ fontSize: 12, color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDeleteDependente(dep.id)}
                        style={{ fontSize: 12, color: 'white', background: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Excluir
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={dep.id} style={{
                    display: 'flex', alignItems: 'center',
                    background: isSelected ? '#EAF6FE' : 'white',
                    borderBottom: '1px solid #f3f4f6',
                  }}>
                    <button
                      onClick={() => { setSelectedPerson(dep); setDropdownOpen(false); setConfirmDeleteInDropdown(null); }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: depColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'white',
                      }}>
                        {initials(dep.nome)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dep.nome}</p>
                        {subtitulo && <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{subtitulo}</p>}
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: 15, color: '#3B9FE0', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteInDropdown(dep.id); }}
                      title={`Excluir ${dep.nome}`}
                      style={{
                        padding: '11px 14px', border: 'none', background: 'transparent',
                        cursor: 'pointer', color: '#d1d5db', fontSize: 16, flexShrink: 0,
                        display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                    >
                      🗑
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Rodapé fixo */}
            <div style={{ borderTop: '1px solid #f3f4f6' }}>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setCadastroError('');
                  setCadastroForm(EMPTY_CADASTRO);
                  setShowCadastroModal(true);
                }}
                disabled={!podeAdicionarMais}
                style={{
                  width: '100%', padding: '11px 14px', border: 'none',
                  background: 'white', cursor: podeAdicionarMais ? 'pointer' : 'not-allowed',
                  textAlign: 'left', fontSize: 13, fontWeight: 600,
                  color: podeAdicionarMais ? '#3B9FE0' : '#9ca3af',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>➕</span>
                {podeAdicionarMais ? 'Cadastrar novo perfil' : 'Limite de 6 perfis atingido'}
              </button>
            </div>
          </div>
        )}
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
