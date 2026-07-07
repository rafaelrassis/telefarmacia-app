import React from 'react';
import { useRepassesAdmin } from '../../hooks/useRepassesAdmin';

const RepassesTab = ({ api, showToast, pharmacists, downloadCsv }) => {
  const {
    repasseFarmId, setRepasseFarmId, repasseDe, setRepasseDe, repasseAte, setRepasseAte,
    repassePreview, setRepassePreview, repassePreviewErr, repasseLoading,
    repasseRef, setRepasseRef, repasseConfirming,
    repasseHistorico, repasseHistLoading, repasseExportLoading, setRepasseExportLoading,
    repasseExpanded, setRepasseExpanded,
    loadRepasseHistorico, handlePreviewRepasse, handleConfirmarRepasse,
  } = useRepassesAdmin(api, showToast);

  return (
    <div className="space-y-6">

      {/* Formulário de prévia */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">Registrar repasse</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Farmacêutico</label>
            <select
              value={repasseFarmId}
              onChange={(e) => { setRepasseFarmId(e.target.value); setRepassePreview(null); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Selecionar...</option>
              {pharmacists.filter((p) => p.pharmacistProfile?.isApproved || p.pharmacistProfile?.isSuspended).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">De</label>
            <input type="date" value={repasseDe} onChange={(e) => { setRepasseDe(e.target.value); setRepassePreview(null); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Até</label>
            <input type="date" value={repasseAte} onChange={(e) => { setRepasseAte(e.target.value); setRepassePreview(null); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        {repassePreviewErr && (
          <p className="text-xs text-red-600 mb-3">{repassePreviewErr}</p>
        )}
        <button
          onClick={handlePreviewRepasse}
          disabled={repasseLoading}
          className="bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold px-5 py-2 rounded-xl transition disabled:opacity-50"
        >
          {repasseLoading ? 'Carregando...' : 'Pré-visualizar'}
        </button>

        {/* Prévia */}
        {repassePreview && (
          <div className="mt-5 border border-violet-200 rounded-xl overflow-hidden">
            <div className="bg-violet-50 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-bold text-violet-800 text-sm">{repassePreview.farmaceutico.nome}</p>
                <p className="text-xs text-violet-600">{repassePreview.farmaceutico.email}</p>
                {repassePreview.farmaceutico.chavePix && (
                  <p className="text-xs text-violet-700 mt-0.5">PIX: <strong>{repassePreview.farmaceutico.chavePix}</strong></p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-violet-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(repassePreview.valorTotal)}
                </p>
                <p className="text-xs text-violet-600">{repassePreview.items.length} consultas · {repassePreview.percentual}% comissão</p>
              </div>
            </div>

            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {repassePreview.items.map((item) => (
                <div key={item.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{item.paciente}</p>
                    <p className="text-xs text-gray-400">{new Date(item.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} · {item.tipo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-violet-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorLiquido)}</p>
                    <p className="text-[10px] text-gray-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorBruto)} bruto</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-violet-100 bg-violet-50 flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-semibold text-violet-700 mb-1">Referência do pagamento (opcional)</label>
                <input
                  type="text"
                  value={repasseRef}
                  onChange={(e) => setRepasseRef(e.target.value)}
                  placeholder="ID da transferência, comprovante..."
                  className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                onClick={handleConfirmarRepasse}
                disabled={repasseConfirming}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 shrink-0"
              >
                {repasseConfirming ? 'Registrando...' : '✓ Confirmar repasse'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Histórico de repasses */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-sm">Histórico de repasses</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setRepasseExportLoading(true);
                const p = new URLSearchParams();
                if (repasseFarmId) p.set('pharmacistId', repasseFarmId);
                await downloadCsv(`/api/admin/repasses/export?${p}`, `repasses-${new Date().toISOString().split('T')[0]}.csv`);
                setRepasseExportLoading(false);
              }}
              disabled={repasseExportLoading}
              className="text-xs font-medium text-violet-600 hover:underline disabled:opacity-50"
            >
              {repasseExportLoading ? 'Exportando…' : '📥 Exportar CSV'}
            </button>
            <button onClick={() => loadRepasseHistorico(repasseFarmId)} className="text-xs text-violet-600 hover:underline">
              Atualizar
            </button>
          </div>
        </div>
        {repasseHistLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
        ) : repasseHistorico.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 italic">Nenhum repasse registrado.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {repasseHistorico.map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setRepasseExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{r.pharmacist?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {r.referenciaTransacao && ` · ref: ${r.referenciaTransacao}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-green-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valorTotal)}</p>
                    <p className="text-[10px] text-gray-400">{r.itensCount} consulta{r.itensCount !== 1 ? 's' : ''} · {repasseExpanded[r.id] ? '▲' : '▼'}</p>
                  </div>
                </div>
                {repasseExpanded[r.id] && r.itens?.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                    {r.itens.map((it) => (
                      <div key={it.id} className="flex items-center justify-between px-4 py-2 text-xs border-b border-gray-50 last:border-0">
                        <span className="text-gray-600">{it.consultaTipo} · {it.consultaId.slice(0, 8)}...</span>
                        <span className="font-semibold text-violet-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.valorLiquido)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RepassesTab;
