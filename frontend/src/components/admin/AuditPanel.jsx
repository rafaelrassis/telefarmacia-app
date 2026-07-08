import React, { useState, useCallback, useEffect } from 'react';
import Paginacao from '../Paginacao';
import { fmtDt, SEL_STYLE } from '../../utils/adminFormat';

// ── Sub-aba "Ações admin" ─────────────────────────────────────────────────────

const AUDIT_ACAO_LABEL = {
  aprovar_farmaceutico:            'Aprovar farmacêutico',
  revogar_aprovacao_farmaceutico:  'Revogar aprovação',
  descadastrar_farmaceutico:       'Descadastrar farmacêutico',
  alterar_status_farmaceutico:     'Alterar status',
  ativar_farmaceutico:             'Ativar farmacêutico',
  suspender_farmaceutico:          'Suspender farmacêutico',
  reativar_farmaceutico:           'Reativar farmacêutico',
  toggle_sistema:                  'Abrir/fechar sistema',
  salvar_horarios_sistema:         'Salvar horários',
  set_preco_consulta:              'Definir preço da consulta',
  set_comissao_padrao:             'Definir comissão padrão',
  set_config_financeiro:           'Salvar config. financeira',
  set_comissao_individual:         'Definir comissão individual',
  remover_comissao_individual:     'Remover comissão individual',
  registrar_repasse:               'Registrar repasse',
  criar_convite_farmaceutico:      'Criar convite',
  revogar_convite_farmaceutico:    'Revogar convite',
  criar_parceiro:                  'Criar parceiro',
  atualizar_parceiro:              'Atualizar parceiro',
  excluir_parceiro:                'Excluir parceiro',
  ajustar_carteira:                'Ajuste de carteira',
  adicionar_admin:                 'Adicionar admin',
  remover_admin:                   'Remover admin',
};

const AuditPanel = ({ api }) => {
  const [items, setItems]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [filterAcao, setFilterAcao] = useState('');

  const LIMIT = 20;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchAudit = useCallback(async (pg) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (filterAcao) p.set('acao', filterAcao);
      const res = await api(`/api/admin/audit?${p}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [api, filterAcao]);

  useEffect(() => { setPage(1); fetchAudit(1); }, [fetchAudit]);

  const goPage = (pg) => { setPage(pg); fetchAudit(pg); };

  const fmtAlvo = (tipo, id) => {
    if (!tipo && !id) return '—';
    const short = id ? `${id.slice(0, 8)}…` : '';
    return tipo ? `${tipo}${short ? ` · ${short}` : ''}` : short;
  };

  const fmtDetalhes = (det) => {
    if (!det || Object.keys(det).length === 0) return '—';
    try {
      return JSON.stringify(det).slice(0, 100);
    } catch { return '—'; }
  };

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {!loading && `${total} ${total === 1 ? 'ação' : 'ações'}`}
        </span>
        <select value={filterAcao} onChange={(e) => setFilterAcao(e.target.value)} style={SEL_STYLE}>
          <option value="">Todas as ações</option>
          {Object.entries(AUDIT_ACAO_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhuma ação registrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3">Admin</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Alvo</th>
                  <th className="text-left px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDt(it.createdAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-gray-800 font-medium">{it.adminNome}</p>
                      <p className="text-gray-400">{it.adminEmail ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 8px', borderRadius: 9999,
                        fontSize: 11, fontWeight: 600,
                        background: '#eff6ff', color: '#1d4ed8',
                      }}>
                        {AUDIT_ACAO_LABEL[it.acao] ?? it.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtAlvo(it.alvoTipo, it.alvoId)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDetalhes(it.detalhes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && <Paginacao page={page} totalPages={totalPages} onPageChange={goPage} />}
    </div>
  );
};

export default AuditPanel;
