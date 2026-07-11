import React, { useState, useCallback, useEffect } from 'react';
import Paginacao from '../Paginacao';
import { fmtDt } from '../../utils/adminFormat';

const selectCls = 'text-sm border border-line rounded-lg px-2.5 py-1.5 outline-none bg-canvas text-ink focus:ring-2 focus:ring-brand';

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
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {!loading && `${total} ${total === 1 ? 'ação' : 'ações'}`}
        </span>
        <label htmlFor="audit-filtro-acao" className="sr-only">Filtrar por ação</label>
        <select id="audit-filtro-acao" value={filterAcao} onChange={(e) => setFilterAcao(e.target.value)} className={selectCls}>
          <option value="">Todas as ações</option>
          {Object.entries(AUDIT_ACAO_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-canvas border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">Nenhuma ação registrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs font-semibold text-muted uppercase tracking-wide">
                  <th className="text-left px-4 py-3 whitespace-nowrap">Data / Hora</th>
                  <th className="text-left px-4 py-3">Admin</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Alvo</th>
                  <th className="text-left px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-surface transition">
                    <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">{fmtDt(it.createdAt)}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-ink font-medium">{it.adminNome}</p>
                      <p className="text-muted">{it.adminEmail ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-wash text-brand-deep">
                        {AUDIT_ACAO_LABEL[it.acao] ?? it.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{fmtAlvo(it.alvoTipo, it.alvoId)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{fmtDetalhes(it.detalhes)}</td>
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
