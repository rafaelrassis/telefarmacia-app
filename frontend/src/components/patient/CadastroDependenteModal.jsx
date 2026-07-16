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
    <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-canvas border border-line rounded-2xl shadow-md w-full max-w-sm p-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-bold text-base text-ink m-0">Adicionar perfil</h3>
        <button onClick={onClose} className="bg-transparent border-none text-[22px] cursor-pointer text-muted hover:text-ink leading-none">×</button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            Nome completo <span className="text-error">*</span>
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
            className={`w-full box-border rounded-lg px-3 py-2 text-sm text-ink bg-canvas outline-none border ${cadastroFieldErrors.nome ? 'border-error' : 'border-line'}`}
          />
          {cadastroFieldErrors.nome && (
            <p className="text-xs text-error mt-1 mb-0">{cadastroFieldErrors.nome}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              Data de nascimento <span className="text-error">*</span>
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
              className={`w-full box-border rounded-lg px-2.5 py-2 text-sm text-ink bg-canvas outline-none border ${cadastroFieldErrors.data ? 'border-error' : 'border-line'}`}
            />
            {cadastroFieldErrors.data && (
              <p className="text-xs text-error mt-1 mb-0">{cadastroFieldErrors.data}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">
              Sexo <span className="text-error">*</span>
            </label>
            <select
              value={cadastroForm.sexo}
              onChange={e => setCadastroForm(f => ({ ...f, sexo: e.target.value }))}
              className="w-full box-border rounded-lg px-2.5 py-2 text-sm text-ink bg-canvas outline-none border border-line"
            >
              <option value="">Selecionar</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted mb-1">
            Parentesco
          </label>
          <select
            value={cadastroForm.parentesco}
            onChange={e => setCadastroForm(f => ({ ...f, parentesco: e.target.value }))}
            className="w-full box-border rounded-lg px-3 py-2 text-sm text-ink bg-canvas outline-none border border-line"
          >
            {PARENTESCO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <label className="flex gap-2.5 items-start cursor-pointer text-[13px] text-ink leading-tight">
          <input
            type="checkbox"
            checked={cadastroForm.aceito}
            onChange={e => setCadastroForm(f => ({ ...f, aceito: e.target.checked }))}
            className="mt-0.5 w-4 h-4 accent-brand shrink-0"
          />
          Confirmo que sou responsável por este dependente e autorizo o uso desta plataforma em seu nome.
        </label>

        {cadastroError && (
          <p className="text-[13px] text-error m-0">{cadastroError}</p>
        )}

        <div className="flex gap-2.5 mt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-line rounded-lg bg-canvas text-sm font-medium text-ink cursor-pointer hover:bg-surface transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleCadastroDependente}
            disabled={cadastroLoading}
            className="flex-1 py-2.5 border-none rounded-lg bg-brand hover:bg-brand-deep text-brand-contrast text-sm font-bold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cadastroLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default CadastroDependenteModal;
