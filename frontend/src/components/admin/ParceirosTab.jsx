import React from 'react';
import { useParceirosAdmin } from '../../hooks/useParceirosAdmin';

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
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '0 0 4px' }}>
            Seção "Onde comprar"
          </p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            {ondeComprarAtivo
              ? 'Ativa — pacientes veem a seção após consultas concluídas.'
              : 'Inativa — seção oculta para todos os pacientes.'}
          </p>
        </div>
        <button
          onClick={handleToggleOC}
          disabled={togglingOC}
          style={{
            padding: '8px 18px', border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 13, cursor: togglingOC ? 'wait' : 'pointer',
            background: ondeComprarAtivo ? '#dc2626' : '#16a34a',
            color: 'white', opacity: togglingOC ? 0.6 : 1, flexShrink: 0,
          }}
        >
          {togglingOC ? '...' : ondeComprarAtivo ? 'Desativar' : 'Ativar'}
        </button>
      </div>

      {/* Métricas — cliques últimos 30 dias */}
      {metricasParceiros.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>
            Cliques por parceiro — últimos 30 dias
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {metricasParceiros.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#374151' }}>
                  {m.nome}
                  {!m.ativo && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>(inativo)</span>}
                </span>
                <span style={{ fontWeight: 700, color: m.clicks > 0 ? '#7c3aed' : '#9ca3af' }}>
                  {m.clicks} clique{m.clicks !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabeçalho da lista + botão novo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: 0 }}>
          Parceiros cadastrados ({parceiros.length})
        </p>
        <button
          onClick={() => { setParceirosForm({ nome: '', logoUrl: '', baseUrl: '', affiliateCode: '', linkTemplate: '', ativo: true, ordem: parceiros.length }); setParceirosFormErr(''); }}
          style={{ padding: '7px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Novo parceiro
        </button>
      </div>

      {/* Formulário de criação / edição */}
      {parceirosForm && (
        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#5b21b6', marginBottom: 12 }}>
            {parceirosForm.id ? 'Editar parceiro' : 'Novo parceiro'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { key: 'nome',          label: 'Nome *',              placeholder: 'Droga Raia' },
              { key: 'baseUrl',       label: 'URL base *',          placeholder: 'https://drogaraia.com.br' },
              { key: 'affiliateCode', label: 'Código afiliado *',   placeholder: 'telefarmacia2024' },
              { key: 'logoUrl',       label: 'URL do logo',         placeholder: 'https://...' },
              { key: 'linkTemplate',  label: 'Template MIP',        placeholder: 'https://drogaraia.com.br/busca?q={produto}&aff={code}' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>{label}</label>
                <input
                  type="text"
                  value={parceirosForm[key] ?? ''}
                  onChange={(e) => setParceirosForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd6fe', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>Ordem</label>
              <input
                type="number"
                value={parceirosForm.ordem ?? 0}
                onChange={(e) => setParceirosForm((p) => ({ ...p, ordem: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #ddd6fe', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16 }}>
              <input
                type="checkbox"
                id="parceiroAtivo"
                checked={parceirosForm.ativo ?? true}
                onChange={(e) => setParceirosForm((p) => ({ ...p, ativo: e.target.checked }))}
              />
              <label htmlFor="parceiroAtivo" style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Ativo</label>
            </div>
          </div>
          {parceirosFormErr && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{parceirosFormErr}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={() => { setParceirosForm(null); setParceirosFormErr(''); }}
              style={{ padding: '7px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveParceiro}
              disabled={savingParceiro}
              style={{ padding: '7px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: savingParceiro ? 'wait' : 'pointer', opacity: savingParceiro ? 0.6 : 1 }}
            >
              {savingParceiro ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de parceiros */}
      {parceirosLoading ? (
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Carregando...</p>
      ) : parceiros.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum parceiro cadastrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {parceiros.map((p) => (
            <div key={p.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt={p.nome} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid #e5e7eb' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>
                    {p.nome.charAt(0)}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.nome}
                    <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6, fontSize: 12 }}>ordem {p.ordem}</span>
                    {!p.ativo && <span style={{ marginLeft: 6, fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>inativo</span>}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                    {p.baseUrl}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => { setParceirosForm({ ...p }); setParceirosFormErr(''); }}
                  style={{ padding: '5px 12px', background: 'white', border: '1px solid #ddd6fe', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#7c3aed', cursor: 'pointer' }}
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelParceiro(p)}
                  style={{ padding: '5px 12px', background: 'white', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: confirmar exclusão de parceiro */}
      {confirmDelParceiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelParceiro(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Excluir parceiro?</h3>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{confirmDelParceiro.nome}</strong> será removido. Os dados de clique históricos serão perdidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelParceiro(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={() => handleDeleteParceiro(confirmDelParceiro.id)}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParceirosTab;
