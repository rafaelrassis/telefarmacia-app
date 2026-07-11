import React from 'react';
import { Store, Pencil, Trash2, Plus, MousePointerClick } from 'lucide-react';
import Modal from '../ui/Modal';
import { useParceirosAdmin } from '../../hooks/useParceirosAdmin';

const FORM_FIELDS = [
  { key: 'nome',          label: 'Nome *',              placeholder: 'Droga Raia' },
  { key: 'baseUrl',       label: 'URL base *',          placeholder: 'https://drogaraia.com.br' },
  { key: 'affiliateCode', label: 'Código afiliado *',   placeholder: 'telefarmacia2024' },
  { key: 'logoUrl',       label: 'URL do logo',         placeholder: 'https://...' },
  { key: 'linkTemplate',  label: 'Template MIP',        placeholder: 'https://drogaraia.com.br/busca?q={produto}&aff={code}' },
];

const ParceirosTab = ({ api, showToast }) => {
  const {
    parceiros, parceirosLoading, ondeComprarAtivo, togglingOC, metricasParceiros,
    parceirosForm, setParceirosForm, parceirosFormErr, setParceirosFormErr, savingParceiro,
    confirmDelParceiro, setConfirmDelParceiro,
    handleToggleOC, handleSaveParceiro, handleDeleteParceiro,
  } = useParceirosAdmin(api, showToast);

  return (
    <div className="space-y-6">

      {/* Toggle global */}
      <div className="bg-canvas border border-line rounded-xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-muted shrink-0" strokeWidth={1.75} />
          <div>
            <p className="font-bold text-sm text-ink">Seção "Onde comprar"</p>
            <p className="text-xs text-muted">
              {ondeComprarAtivo
                ? 'Ativa — pacientes veem a seção após consultas concluídas.'
                : 'Inativa — seção oculta para todos os pacientes.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleOC}
          disabled={togglingOC}
          className={`px-4 py-2 rounded-lg font-bold text-xs text-white shrink-0 transition ${
            ondeComprarAtivo ? 'bg-error hover:bg-error/90' : 'bg-success hover:bg-success/90'
          } disabled:opacity-60`}
        >
          {togglingOC ? '...' : ondeComprarAtivo ? 'Desativar' : 'Ativar'}
        </button>
      </div>

      {/* Métricas — cliques últimos 30 dias */}
      {metricasParceiros.length > 0 && (
        <div className="bg-canvas border border-line rounded-xl px-5 py-4">
          <p className="font-bold text-ink text-sm mb-2.5 inline-flex items-center gap-1.5">
            <MousePointerClick className="w-4 h-4 text-muted" />
            Cliques por parceiro — últimos 30 dias
          </p>
          <div className="flex flex-col divide-y divide-line">
            {metricasParceiros.map((m) => (
              <div key={m.id} className="flex justify-between items-center text-sm py-1.5">
                <span className="text-ink">
                  {m.nome}
                  {!m.ativo && <span className="text-xs text-muted ml-1.5">(inativo)</span>}
                </span>
                <span className={`font-bold ${m.clicks > 0 ? 'text-brand' : 'text-muted'}`}>
                  {m.clicks} clique{m.clicks !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabeçalho da lista + botão novo */}
      <div className="flex items-center justify-between">
        <p className="font-bold text-ink text-sm">
          Parceiros cadastrados ({parceiros.length})
        </p>
        <button
          onClick={() => { setParceirosForm({ nome: '', logoUrl: '', baseUrl: '', affiliateCode: '', linkTemplate: '', ativo: true, ordem: parceiros.length }); setParceirosFormErr(''); }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand hover:bg-brand-deep text-white rounded-lg text-xs font-bold transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo parceiro
        </button>
      </div>

      {/* Formulário de criação / edição */}
      {parceirosForm && (
        <div className="bg-brand-wash border border-brand/30 rounded-xl px-5 py-4">
          <p className="font-bold text-brand-deep text-sm mb-3">
            {parceirosForm.id ? 'Editar parceiro' : 'Novo parceiro'}
          </p>
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {FORM_FIELDS.map(({ key, label, placeholder }) => {
              const inputId = `parceiro-${key}`;
              return (
                <div key={key}>
                  <label htmlFor={inputId} className="text-[11px] font-semibold text-muted block mb-1">{label}</label>
                  <input
                    id={inputId}
                    type="text"
                    value={parceirosForm[key] ?? ''}
                    onChange={(e) => setParceirosForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-2.5 py-1.5 border border-brand/30 rounded-lg text-sm text-ink outline-none focus:ring-2 focus:ring-brand bg-canvas"
                  />
                </div>
              );
            })}
            <div>
              <label htmlFor="parceiro-ordem" className="text-[11px] font-semibold text-muted block mb-1">Ordem</label>
              <input
                id="parceiro-ordem"
                type="number"
                value={parceirosForm.ordem ?? 0}
                onChange={(e) => setParceirosForm((p) => ({ ...p, ordem: parseInt(e.target.value) || 0 }))}
                className="w-full px-2.5 py-1.5 border border-brand/30 rounded-lg text-sm text-ink outline-none focus:ring-2 focus:ring-brand bg-canvas"
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="parceiroAtivo"
                checked={parceirosForm.ativo ?? true}
                onChange={(e) => setParceirosForm((p) => ({ ...p, ativo: e.target.checked }))}
                className="accent-brand"
              />
              <label htmlFor="parceiroAtivo" className="text-sm font-semibold text-ink cursor-pointer">Ativo</label>
            </div>
          </div>
          {parceirosFormErr && <p role="alert" className="text-error text-xs mt-2">{parceirosFormErr}</p>}
          <div className="flex gap-2 mt-3.5">
            <button
              onClick={() => { setParceirosForm(null); setParceirosFormErr(''); }}
              className="px-4 py-1.5 bg-canvas border border-line rounded-lg text-sm text-ink hover:bg-surface transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveParceiro}
              disabled={savingParceiro}
              className="px-4 py-1.5 bg-brand hover:bg-brand-deep text-white rounded-lg text-sm font-bold disabled:opacity-60 transition"
            >
              {savingParceiro ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de parceiros */}
      {parceirosLoading ? (
        <p className="text-muted text-sm">Carregando...</p>
      ) : parceiros.length === 0 ? (
        <p className="text-muted text-sm">Nenhum parceiro cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {parceiros.map((p) => (
            <div key={p.id} className="bg-canvas border border-line rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt={p.nome} className="w-7 h-7 object-contain rounded border border-line shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="w-7 h-7 rounded bg-brand-wash flex items-center justify-center text-sm font-bold text-brand shrink-0">
                    {p.nome.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">
                    {p.nome}
                    <span className="font-normal text-muted ml-1.5 text-xs">ordem {p.ordem}</span>
                    {!p.ativo && <span className="ml-1.5 text-xs bg-error-wash text-error px-1.5 py-0.5 rounded-full font-semibold">inativo</span>}
                  </p>
                  <p className="text-xs text-muted truncate max-w-[320px]">
                    {p.baseUrl}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => { setParceirosForm({ ...p }); setParceirosFormErr(''); }}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-canvas border border-brand/40 rounded-md text-xs font-semibold text-brand-deep hover:bg-brand-wash transition"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelParceiro(p)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-canvas border border-error/40 rounded-md text-xs font-semibold text-error hover:bg-error-wash transition"
                >
                  <Trash2 className="w-3 h-3" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: confirmar exclusão de parceiro */}
      {confirmDelParceiro && (
        <Modal
          title="Excluir parceiro?"
          onClose={() => setConfirmDelParceiro(null)}
          maxWidth="max-w-sm"
          footer={(
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelParceiro(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-line rounded-xl hover:bg-surface transition text-ink">
                Cancelar
              </button>
              <button onClick={() => handleDeleteParceiro(confirmDelParceiro.id)}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-error text-white rounded-xl hover:bg-error/90 transition">
                Excluir
              </button>
            </div>
          )}
        >
          <div className="px-6 pt-4 pb-2">
            <p className="text-sm text-ink">
              <strong>{confirmDelParceiro.nome}</strong> será removido. Os dados de clique históricos serão perdidos.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ParceirosTab;
