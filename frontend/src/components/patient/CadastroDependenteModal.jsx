import React from 'react';
import { PARENTESCO_OPTS, validarNome, validarData } from '../../utils/patientDashboardFormat';

const CadastroDependenteModal = ({
  cadastroForm, setCadastroForm,
  cadastroLoading, cadastroError, setCadastroError,
  cadastroFieldErrors, setCadastroFieldErrors,
  handleCadastroDependente,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', margin: 0 }}>Adicionar perfil</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Nome completo <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={cadastroForm.nome}
            onChange={e => {
              const v = e.target.value;
              setCadastroForm(f => ({ ...f, nome: v }));
              setCadastroFieldErrors(fe => ({ ...fe, nome: validarNome(v) }));
            }}
            placeholder="Nome do dependente"
            style={{ width: '100%', boxSizing: 'border-box', border: cadastroFieldErrors.nome ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
          {cadastroFieldErrors.nome && (
            <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4, marginBottom: 0 }}>{cadastroFieldErrors.nome}</p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
              Data de nascimento <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={cadastroForm.dataNascimento}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => {
                const v = e.target.value;
                setCadastroForm(f => ({ ...f, dataNascimento: v }));
                setCadastroFieldErrors(fe => ({ ...fe, data: validarData(v) }));
              }}
              style={{ width: '100%', boxSizing: 'border-box', border: cadastroFieldErrors.data ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
            {cadastroFieldErrors.data && (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4, marginBottom: 0 }}>{cadastroFieldErrors.data}</p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
              Sexo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={cadastroForm.sexo}
              onChange={e => setCadastroForm(f => ({ ...f, sexo: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}
            >
              <option value="">Selecionar</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Parentesco
          </label>
          <select
            value={cadastroForm.parentesco}
            onChange={e => setCadastroForm(f => ({ ...f, parentesco: e.target.value }))}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}
          >
            {PARENTESCO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
          <input
            type="checkbox"
            checked={cadastroForm.aceito}
            onChange={e => setCadastroForm(f => ({ ...f, aceito: e.target.checked }))}
            style={{ marginTop: 2, width: 16, height: 16, accentColor: '#3B9FE0', flexShrink: 0 }}
          />
          Confirmo que sou responsável por este dependente e autorizo o uso desta plataforma em seu nome.
        </label>

        {cadastroError && (
          <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{cadastroError}</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCadastroDependente}
            disabled={cadastroLoading}
            style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#3B9FE0', color: 'white', fontSize: 14, fontWeight: 700, cursor: cadastroLoading ? 'not-allowed' : 'pointer', opacity: cadastroLoading ? 0.6 : 1 }}
          >
            {cadastroLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default CadastroDependenteModal;
