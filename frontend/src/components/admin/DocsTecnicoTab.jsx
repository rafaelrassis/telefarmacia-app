import React, { useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle } from 'lucide-react';
import { Secao, Tabela, Code } from '../docs/DocsUI.jsx';

// Documentação técnica sensível: vem de GET /api/admin/docs (só admin),
// nunca embutida no bundle público.
const COR = {
  GET: 'bg-success-wash text-success',
  POST: 'bg-brand-wash text-brand-deep',
  PUT: 'bg-alert-wash text-alert',
  PATCH: 'bg-alert-wash text-alert',
  DELETE: 'bg-error-wash text-error',
};

const ACESSO = {
  admin: 'bg-error-wash text-error',
  jwt: 'bg-brand-wash text-brand-deep',
  publico: 'bg-surface text-muted border border-line',
};

const md = (t) => t.split('`').map((p, i) => (i % 2 ? <Code key={i}>{p}</Code> : p));

const DocsTecnicoTab = ({ api }) => {
  const [docs, setDocs] = useState(null);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let vivo = true;
    api('/api/admin/docs')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => vivo && setDocs(d))
      .catch((s) => vivo && setErro(`Não foi possível carregar (${s}).`));
    return () => { vivo = false; };
  }, [api]);

  const grupos = useMemo(() => {
    if (!docs) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return docs.endpoints;
    return docs.endpoints
      .map((g) => ({ ...g, rotas: g.rotas.filter((r) => `${r.metodo} ${r.path} ${r.acesso}`.toLowerCase().includes(q)) }))
      .filter((g) => g.rotas.length);
  }, [docs, busca]);

  if (erro) return <p className="text-error text-sm">{erro}</p>;
  if (!docs) return <p className="text-muted text-sm">Carregando documentação técnica…</p>;

  const total = docs.endpoints.reduce((n, g) => n + g.rotas.length, 0);
  const faltando = docs.env.backend.filter((e) => !e.configurada).length;

  return (
    <div>
      <div className="bg-alert-wash border border-alert/30 rounded-xl p-4 text-sm mb-8">
        Área restrita a administradores. Não compartilhe prints desta tela.
        <span className="block text-muted mt-1">
          Ambiente <strong>{docs.sistema.nodeEnv}</strong> · Node {docs.sistema.node}
          {docs.sistema.commit && <> · commit <Code>{docs.sistema.commit}</Code></>}
          {' '}· no ar há {Math.round(docs.sistema.uptimeSeg / 60)} min
        </span>
      </div>

      <Secao id="api" titulo={`Endpoints (${total})`}>
        <p className="text-sm text-muted">Lista gerada em tempo real a partir das rotas registradas no backend.</p>
        <label className="flex items-center gap-2 border border-line rounded-xl px-3 py-2 bg-canvas">
          <Search className="w-4 h-4 text-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por rota, método ou acesso…"
            className="w-full bg-transparent outline-none text-sm"
          />
        </label>
        {grupos.map((g) => (
          <details key={g.grupo} open={!!busca} className="border border-line rounded-xl bg-surface">
            <summary className="cursor-pointer px-4 py-3 font-semibold text-ink">
              /{g.grupo} <span className="text-muted font-normal text-sm">({g.rotas.length})</span>
            </summary>
            <ul className="px-4 pb-3 space-y-1">
              {g.rotas.map((r) => (
                <li key={r.metodo + r.path} className="flex items-center gap-2 text-[13px] flex-wrap">
                  <span className={`w-14 text-center rounded px-1.5 py-0.5 font-bold text-[11px] ${COR[r.metodo] || ''}`}>{r.metodo}</span>
                  <code className="text-ink break-all">{r.path}</code>
                  <span className={`text-[11px] rounded px-1.5 py-0.5 ${ACESSO[r.acesso]}`}>{r.acesso}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </Secao>

      <Secao id="ambiente" titulo="Variáveis de ambiente">
        <p className="text-sm text-muted">
          Só nomes e status — valores nunca saem do servidor.
          {faltando > 0 && <strong className="text-alert"> {faltando} não configurada(s) no backend.</strong>}
        </p>
        <Tabela
          cabecalho={['Backend', 'Uso', 'Status']}
          linhas={docs.env.backend.map((e) => [
            e.nome,
            e.uso,
            e.configurada
              ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="w-4 h-4" />ok</span>
              : <span className="inline-flex items-center gap-1 text-alert"><XCircle className="w-4 h-4" />ausente</span>,
          ])}
        />
        <Tabela cabecalho={['Frontend (build Vercel)', 'Uso']} linhas={docs.env.frontend.map((e) => [e.nome, e.uso])} />
      </Secao>

      <Secao id="crons" titulo="Tarefas agendadas">
        <Tabela cabecalho={['Agenda', 'Job', 'O que faz']} linhas={docs.crons.map((c) => [c.agenda, c.job, c.descricao])} />
      </Secao>

      <Secao id="raw" titulo="Colunas fora do schema Prisma">
        <p className="text-sm text-muted">Em <Code>FilaAgendada</Code> e <Code>FilaUrgente</Code>, acessadas via SQL raw. Criadas por <Code>backend/scripts/migrate-*.mjs</Code>.</p>
        <Tabela cabecalho={['Coluna', 'Tipo', 'Conteúdo']} linhas={docs.camposRaw.map((c) => [c.coluna, c.tipo, c.conteudo])} />
      </Secao>

      <Secao id="operacao" titulo="Operação e deploy">
        <ul className="list-disc pl-5 space-y-1.5">
          {docs.operacao.map((t, i) => <li key={i}>{md(t)}</li>)}
        </ul>
      </Secao>
    </div>
  );
};

export default DocsTecnicoTab;
