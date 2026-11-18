// Documentação técnica servida apenas para administradores (GET /api/admin/docs).
// Conteúdo sensível (endpoints, variáveis de ambiente, detalhes internos) fica
// fora do bundle público do frontend. Valores de env NUNCA são expostos —
// só o nome e se está configurada.

const PREFIXOS_PROBE = ['/api/auth/__probe', '/api/__probe', '/__probe'];

const prefixoDoRouter = (layer) => {
  const match = layer.matchers?.[0];
  if (typeof match !== 'function') return '';
  for (const probe of PREFIXOS_PROBE) {
    const r = match(probe);
    if (r && typeof r.path === 'string') return r.path === '/' ? '' : r.path;
  }
  return '';
};

const nivelAcesso = (stack = []) => {
  const nomes = stack.map((s) => s.name);
  if (nomes.includes('adminMiddleware')) return 'admin';
  if (nomes.includes('authMiddleware')) return 'jwt';
  return 'publico';
};

const coletarRotas = (stack, prefixo, out) => {
  for (const layer of stack) {
    if (layer.route) {
      const metodos = Object.keys(layer.route.methods || {}).filter((m) => m !== '_all');
      for (const m of metodos) {
        out.push({
          metodo: m.toUpperCase(),
          path: `${prefixo}${layer.route.path}`,
          acesso: nivelAcesso(layer.route.stack),
        });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      coletarRotas(layer.handle.stack, prefixo + prefixoDoRouter(layer), out);
    }
  }
};

// Lê as rotas registradas no app em runtime — a lista nunca fica desatualizada.
export const listarEndpoints = (app) => {
  const out = [];
  coletarRotas(app?.router?.stack || [], '', out);
  const vistos = new Set();
  const unicos = out.filter((r) => {
    const k = `${r.metodo} ${r.path}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  const grupos = {};
  for (const r of unicos) {
    const seg = r.path.replace(/^\/api\/?/, '').split('/')[0] || 'raiz';
    (grupos[seg] ||= []).push(r);
  }
  return Object.entries(grupos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grupo, rotas]) => ({ grupo, rotas }));
};

const ENV_BACKEND = [
  ['DATABASE_URL', 'Conexão PostgreSQL'],
  ['JWT_SECRET', 'Assinatura dos tokens (trocar invalida todas as sessões)'],
  ['NODE_ENV', 'Modo de execução'],
  ['PORT', 'Porta HTTP'],
  ['FRONTEND_URL', 'URL do frontend (CORS, links em e-mails)'],
  ['BACKEND_URL', 'URL pública da API (webhooks)'],
  ['ADMIN_EMAILS', 'E-mails admin fixos (somados à lista do painel)'],
  ['ADMIN_NOTIFICATION_EMAIL', 'Destino de avisos administrativos'],
  ['GOOGLE_CLIENT_ID', 'Login com Google (mesmo valor do frontend)'],
  ['ENCRYPTION_KEY', 'Criptografia do segredo TOTP'],
  ['VAPID_PUBLIC_KEY', 'Web Push — chave pública'],
  ['VAPID_PRIVATE_KEY', 'Web Push — chave privada (trocar invalida inscrições)'],
  ['VAPID_SUBJECT', 'Web Push — contato'],
  ['BREVO_API_KEY', 'Envio de e-mails'],
  ['SMTP_FROM_EMAIL', 'Remetente dos e-mails'],
  ['MERCADOPAGO_ACCESS_TOKEN', 'Mercado Pago — API'],
  ['MERCADOPAGO_WEBHOOK_SECRET', 'Mercado Pago — validação de webhook'],
  ['PRECO_CONSULTA_PADRAO', 'Preço inicial da consulta'],
  ['TERMOS_VERSAO', 'Versão dos termos de uso'],
  ['TERMOS_TELEFARMACIA_VERSAO', 'Versão do termo de telefarmácia'],
  ['UPLOAD_DIR', 'Diretório de uploads (volume persistente)'],
  ['SENTRY_DSN', 'Monitoramento de erros'],
];

const ENV_FRONTEND = [
  ['VITE_API_URL', 'URL base da API'],
  ['VITE_GOOGLE_CLIENT_ID', 'Login com Google'],
  ['VITE_SENTRY_DSN', 'Monitoramento de erros no cliente'],
  ['VITE_TERMOS_TELEFARMACIA_VERSAO', 'Versão do termo exibido'],
];

const CRONS = [
  ['*/5 * * * *', 'jobExpirarUrgentesAguardando', 'Urgentes sem aceite → cancela e estorna'],
  ['*/5 * * * *', 'jobExpirarUrgentesAceitas', 'Urgentes aceitas sem início → alerta / cancela'],
  ['*/5 * * * *', 'jobLembretesMedicacao', 'Push de lembretes de medicação'],
  ['*/15 * * * *', 'jobExpirarAgendadasOrfas', 'Agendadas vencidas + tolerância → cancela e estorna'],
  ['*/15 * * * *', 'jobLembreteConsulta', 'Push ~1h antes da agendada'],
  ['*/30 * * * *', 'jobAlertarAtendimentosLongos', 'Atendimentos > 4h → alerta'],
  ['0 * * * *', 'jobExcluirCadastrosNaoConfirmados', 'Exclui cadastros não confirmados > 24h'],
  ['0 3 * * *', 'jobExpirarTrialAssinaturas', 'Expira trials'],
  ['0 3 * * *', 'jobMarcarAssinaturasInadimplentes', 'Marca inadimplentes'],
  ['0 3 * * *', 'jobFinalizarAssinaturasCanceladas', 'Finaliza canceladas no fim do ciclo'],
];

const CAMPOS_RAW = [
  ['triagem', 'JSONB', 'Formulário de triagem'],
  ['observacoes', 'TEXT', 'Orientações do farmacêutico'],
  ['receita', 'JSONB', 'Itens da receita'],
  ['receita_pdf_url / encaminhamento_pdf_url', 'TEXT', 'Caminho dos PDFs'],
  ['motivo', 'TEXT', 'Motivo da consulta'],
  ['finalizacao', 'JSONB', 'Dados de conclusão'],
  ['retorno_sugerido / retorno_dispensado', 'JSONB / BOOLEAN', 'Retorno sugerido e se foi dispensado'],
  ['motivo_cancelamento', 'TEXT', 'Motivo do cancelamento'],
  ['remarcacoes / remarcacao_pendente', 'INTEGER / JSONB', 'Contador (máx. 2) e proposta pendente'],
  ['encaminhamento_detalhe', 'TEXT', 'Resumo clínico do encaminhamento'],
  ['whatsapp_contato', 'TEXT', 'Telefone de contato'],
  ['sem_contato_log', 'JSONB', 'Tentativas de contato sem sucesso'],
  ['lembrete_enviado', 'BOOLEAN', 'Só FilaAgendada — lembrete já enviado'],
];

const OPERACAO = [
  'Antes do deploy: `npm test` (backend) e `npm run build` (frontend) verdes.',
  'Migrações: `npx prisma migrate deploy` + `backend/scripts/migrate-*.mjs` (colunas fora do schema, idempotentes).',
  'Migração aditiva antes do código novo; remoção de colunas só depois.',
  'Após o deploy: `GET /api/health` = 200, login paciente/farmacêutico, um agendamento ponta a ponta, Sentry limpo.',
  'Backup: `pg_dump -Fc` diário fora do host, retenção 30 dias; testar restauração trimestralmente.',
  'Não renomear chaves `@Telefarmacia:*` do localStorage (desloga todos).',
  'Queries raw retornam aliases em minúsculas no PostgreSQL.',
];

export const getDocsTecnico = (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    geradoEm: new Date().toISOString(),
    sistema: {
      nodeEnv: process.env.NODE_ENV || 'development',
      node: process.version,
      uptimeSeg: Math.round(process.uptime()),
      commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || null,
    },
    endpoints: listarEndpoints(req.app),
    env: {
      backend: ENV_BACKEND.map(([nome, uso]) => ({ nome, uso, configurada: !!process.env[nome] })),
      frontend: ENV_FRONTEND.map(([nome, uso]) => ({ nome, uso })),
    },
    crons: CRONS.map(([agenda, job, descricao]) => ({ agenda, job, descricao })),
    camposRaw: CAMPOS_RAW.map(([coluna, tipo, conteudo]) => ({ coluna, tipo, conteudo })),
    operacao: OPERACAO,
  });
};
