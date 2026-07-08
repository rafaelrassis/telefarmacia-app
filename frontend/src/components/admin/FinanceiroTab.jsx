import React, { useState, useCallback, useEffect } from 'react';
import StatCard from './StatCard';

const FinanceiroTab = ({
  api, downloadCsv,
  finConfig, finLoading, loadFinanceiro,
  finPreco, setFinPreco, finComissao, setFinComissao,
  finMaxUrg, setFinMaxUrg, finTolerancia, setFinTolerancia,
  finLimiteOcorrencias, setFinLimiteOcorrencias, finSaving, handleSalvarConfig,
  editingComissao, setEditingComissao, savingComissao,
  handleSalvarComissao, handleRemoverComissao,
}) => {
  const [finVisao, setFinVisao]             = useState(null);
  const [finVisaoLoading, setFinVisaoLoading] = useState(false);
  const [finPeriodoDe, setFinPeriodoDe]     = useState('');
  const [finPeriodoAte, setFinPeriodoAte]   = useState('');
  const [finExportLoading, setFinExportLoading] = useState(false);

  const loadVisaoFinanceira = useCallback(async (de, ate) => {
    setFinVisaoLoading(true);
    try {
      const params = new URLSearchParams();
      if (de)  params.set('de',  de);
      if (ate) params.set('ate', ate);
      const res = await api(`/api/admin/financeiro?${params}`);
      if (res.ok) setFinVisao(await res.json());
    } finally { setFinVisaoLoading(false); }
  }, [api]);

  // Ao entrar na aba (equivalente ao mount deste componente), recarrega a
  // config (igual ao comportamento original) e a visão financeira.
  useEffect(() => {
    loadFinanceiro();
    loadVisaoFinanceira(finPeriodoDe, finPeriodoAte);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">

      {/* ── Visão financeira ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Visão Financeira</h3>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">De</label>
              <input type="date" value={finPeriodoDe} onChange={(e) => setFinPeriodoDe(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Até</label>
              <input type="date" value={finPeriodoAte} onChange={(e) => setFinPeriodoAte(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand outline-none" />
            </div>
            <button
              onClick={() => loadVisaoFinanceira(finPeriodoDe, finPeriodoAte)}
              disabled={finVisaoLoading}
              className="text-sm font-medium bg-brand hover:bg-brand-deep text-white px-4 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {finVisaoLoading ? '…' : 'Filtrar'}
            </button>
            <button
              onClick={async () => {
                setFinExportLoading(true);
                const p = new URLSearchParams();
                if (finPeriodoDe)  p.set('de', finPeriodoDe);
                if (finPeriodoAte) p.set('ate', finPeriodoAte);
                await downloadCsv(`/api/admin/financeiro/export?${p}`, `financeiro-${new Date().toISOString().split('T')[0]}.csv`);
                setFinExportLoading(false);
              }}
              disabled={finExportLoading}
              className="text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {finExportLoading ? 'Exportando…' : '📥 Exportar CSV'}
            </button>
          </div>
        </div>
        {finVisao ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              value={`R$ ${Number(finVisao.totalFaturado).toFixed(2).replace('.', ',')}`}
              label="Total faturado"
              color="text-blue-600"
            />
            <StatCard
              value={`R$ ${Number(finVisao.totalPagoFarm).toFixed(2).replace('.', ',')}`}
              label="Pago farmacêuticos"
              color="text-teal-600"
            />
            <StatCard
              value={`R$ ${Number(finVisao.receitaLiquida).toFixed(2).replace('.', ',')}`}
              label="Receita líquida"
              color={finVisao.receitaLiquida >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
            <StatCard
              value={String(finVisao.consultasConcluidas)}
              label="Consultas concluídas"
              sub={finVisao.periodo ? `${finVisao.periodo.de} → ${finVisao.periodo.ate}` : undefined}
              color="text-gray-800"
            />
          </div>
        ) : (
          finVisaoLoading
            ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
            : null
        )}
      </div>

      {/* ── Configurações de preço e comissão ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">Preço e Comissão Padrão</p>
          <p className="text-xs text-gray-500 mt-0.5">Aplicados em todos os novos agendamentos.</p>
        </div>
        {finLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* Preço */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                Preço da consulta (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={finPreco}
                onChange={(e) => setFinPreco(e.target.value)}
                style={{ width: '100%', maxWidth: 240, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Ex: 50.00"
              />
            </div>

            {/* Comissão padrão */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>
                  Comissão padrão dos farmacêuticos
                </label>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#3B9FE0' }}>{finComissao}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="1"
                value={finComissao || 0}
                onChange={(e) => setFinComissao(e.target.value)}
                style={{ width: '100%', accentColor: '#3B9FE0' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                <span>0%</span>
                <span style={{ color: '#3B9FE0', fontWeight: 600, textAlign: 'center' }}>
                  R$ {(parseFloat(finPreco) || 0).toFixed(2).replace('.', ',')} cobrado → R$ {((parseFloat(finPreco) || 0) * (parseFloat(finComissao) || 0) / 100).toFixed(2).replace('.', ',')} ao farmacêutico ({finComissao}%)
                </span>
                <span>100%</span>
              </div>
            </div>

            {/* Limite de urgências simultâneas */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                Limite de urgências simultâneas por farmacêutico
              </label>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={finMaxUrg}
                onChange={(e) => setFinMaxUrg(e.target.value)}
                style={{ width: '100%', maxWidth: 120, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="1"
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Farmacêutico no limite não recebe novas urgências. Default: 1.
              </p>
            </div>

            {/* Tolerância de expiração de consulta agendada */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                Tolerância p/ expirar consulta agendada sem aceite (min)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                step="1"
                value={finTolerancia}
                onChange={(e) => setFinTolerancia(e.target.value)}
                style={{ width: '100%', maxWidth: 120, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="30"
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Após o horário marcado + esse prazo sem aceite, a consulta expira com estorno automático. Default: 30 min.
              </p>
            </div>

            {/* Limite de ocorrências (devoluções/sem-contato) em 30 dias */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>
                Limite de ocorrências (30d) p/ alerta de farmacêutico
              </label>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={finLimiteOcorrencias}
                onChange={(e) => setFinLimiteOcorrencias(e.target.value)}
                style={{ width: '100%', maxWidth: 120, border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="5"
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Devoluções + "sem contato" nos últimos 30 dias. Acima disso, o farmacêutico é destacado na aba Farmacêuticos. Default: 5.
              </p>
            </div>

            {/* Botão único salvar ambos */}
            <button
              disabled={finSaving}
              onClick={handleSalvarConfig}
              style={{
                background: finSaving ? '#9ca3af' : '#2563eb',
                color: '#ffffff',
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                cursor: finSaving ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                marginTop: 12,
                display: 'block',
              }}
            >
              {finSaving ? 'Salvando…' : '💾 Salvar configurações'}
            </button>
          </div>
        )}
      </div>

      {/* ── Comissões individuais ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">Comissões Individuais</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Sobrescreve a comissão padrão por farmacêutico. Deixe em branco para usar o padrão.
          </p>
        </div>
        {finLoading || !finConfig ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
        ) : finConfig.farmaceuticos.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum farmacêutico cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3 w-44">Comissão (%)</th>
                  <th className="text-left px-4 py-3 w-36">Recebe/consulta</th>
                  <th className="text-left px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {finConfig.farmaceuticos.map((f) => {
                  const current  = editingComissao[f.id] !== undefined
                    ? editingComissao[f.id]
                    : (f.comissao != null ? String(f.comissao) : '');
                  const isSaving = !!savingComissao[f.id];
                  const pctNum   = current.trim() !== '' ? parseFloat(current) : finConfig.comissaoPadrao;
                  const recebe   = isNaN(pctNum) ? null : (finConfig.preco * pctNum / 100);
                  const isPadrao = current.trim() === '';

                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{f.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={current}
                            placeholder={`padrão (${finConfig.comissaoPadrao}%)`}
                            onChange={(e) => setEditingComissao((prev) => ({ ...prev, [f.id]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none"
                          />
                          <span className="text-gray-400 text-xs shrink-0">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {recebe != null ? (
                          <span className={`text-sm font-semibold ${isPadrao ? 'text-gray-400' : 'text-brand-deep'}`}>
                            R$ {recebe.toFixed(2).replace('.', ',')}
                            {isPadrao && <span className="text-[10px] font-normal ml-1">(padrão)</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isSaving || current.trim() === ''}
                            style={{ opacity: (isSaving || current.trim() === '') ? 0.4 : 1 }}
                            onClick={() => handleSalvarComissao(f.id, f.name, current)}
                            className="px-3 py-1.5 text-xs font-semibold bg-brand hover:bg-brand-deep text-white rounded-lg transition"
                          >
                            {isSaving ? '…' : '💾 Salvar'}
                          </button>
                          <button
                            disabled={isSaving || (f.comissao == null && current.trim() === '')}
                            style={{ opacity: (isSaving || (f.comissao == null && current.trim() === '')) ? 0.4 : 1 }}
                            onClick={() => handleRemoverComissao(f.id, f.name, finConfig.comissaoPadrao)}
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition"
                          >
                            🔄 Usar padrão
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
    </div>
  );
};

export default FinanceiroTab;
