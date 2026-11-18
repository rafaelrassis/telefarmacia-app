import React from 'react';
import { Secao, Tabela, Code } from './DocsUI.jsx';

// Gerado a partir de backend/src/routes/*.js — atualizar ao criar rotas novas.
const API = [{"grupo": "Admin e sistema", "rotas": [["GET", "/api/admin/pharmacists", "admin"], ["GET", "/api/admin/patients", "admin"], ["DELETE", "/api/admin/pharmacists/:userId", "admin"], ["DELETE", "/api/admin/pacientes/:userId", "admin"], ["GET", "/api/admin/farmaceuticos/pendentes", "admin"], ["GET", "/api/admin/metricas", "admin"], ["GET", "/api/admin/farmaceuticos/:id/documentos", "admin"], ["PATCH", "/api/admin/farmaceuticos/:id/status", "admin"], ["GET", "/api/admin/farmaceuticos/:id/ocorrencias", "admin"], ["GET", "/api/sistema/status", "público"], ["PATCH", "/api/admin/sistema", "admin"], ["GET", "/api/admin/horarios", "admin"], ["PUT", "/api/admin/horarios", "admin"], ["GET", "/api/sistema/aberto", "público"], ["GET", "/api/disponibilidade", "público"], ["GET", "/api/sistema/horarios", "JWT"], ["POST", "/api/farmaceutico/ping", "JWT"], ["GET", "/api/admin/logs", "admin"], ["GET", "/api/admin/audit", "admin"], ["GET", "/api/admin/consultas", "admin"], ["GET", "/api/admin/fila/tempo-real", "admin"], ["GET", "/api/admin/avaliacoes", "admin"], ["GET", "/api/admin/avaliacoes/resumo", "admin"], ["POST", "/api/admin/carteira/:pacienteId/ajuste", "admin"], ["GET", "/api/admin/plano", "admin"], ["PUT", "/api/admin/plano", "admin"], ["GET", "/api/admin/trial", "admin"], ["PUT", "/api/admin/trial", "admin"], ["GET", "/api/admin/admins", "admin"], ["POST", "/api/admin/admins", "admin"], ["DELETE", "/api/admin/admins/:email", "admin"], ["GET", "/api/admin/config/financeiro", "admin"], ["PUT", "/api/admin/config", "admin"], ["PUT", "/api/admin/config/preco", "admin"], ["PUT", "/api/admin/config/comissao-padrao", "admin"], ["PUT", "/api/admin/farmaceuticos/:id/comissao", "admin"], ["PUT", "/api/admin/comissoes/:id", "admin"], ["DELETE", "/api/admin/comissoes/:id", "admin"], ["GET", "/api/admin/financeiro", "admin"], ["GET", "/api/admin/financeiro/export", "admin"], ["GET", "/api/admin/repasses/preview", "admin"], ["GET", "/api/admin/repasses/export", "admin"], ["GET", "/api/admin/repasses", "admin"], ["POST", "/api/admin/repasses", "admin"], ["GET", "/api/admin/convites", "admin"], ["POST", "/api/admin/convites", "admin"], ["DELETE", "/api/admin/convites/:id", "admin"], ["POST", "/api/admin/farmaceuticos/:id/suspender", "admin"], ["POST", "/api/admin/farmaceuticos/:id/reativar", "admin"], ["GET", "/api/admin/parceiros", "admin"], ["POST", "/api/admin/parceiros", "admin"], ["PUT", "/api/admin/parceiros/:id", "admin"], ["DELETE", "/api/admin/parceiros/:id", "admin"], ["GET", "/api/admin/parceiros/metricas", "admin"], ["GET", "/api/admin/config/onde-comprar", "admin"], ["PATCH", "/api/admin/config/onde-comprar", "admin"]]}, {"grupo": "Assinatura", "rotas": [["POST", "/api/assinaturas/iniciar", "JWT"], ["GET", "/api/assinaturas/minha", "JWT"], ["POST", "/api/assinaturas/cancelar", "JWT"]]}, {"grupo": "Autenticação", "rotas": [["POST", "/api/auth/google", "público"], ["POST", "/api/auth/register", "público"], ["POST", "/api/auth/login", "público"], ["GET", "/api/auth/me", "JWT"], ["PUT", "/api/auth/onboarding", "JWT"], ["POST", "/api/auth/totp/setup", "JWT"], ["POST", "/api/auth/totp/enable", "JWT"], ["POST", "/api/auth/totp/disable", "JWT"], ["POST", "/api/auth/totp/verify", "público"], ["POST", "/api/auth/esqueci-senha", "público"], ["POST", "/api/auth/redefinir-senha", "público"], ["POST", "/api/auth/confirmar-email", "público"], ["POST", "/api/auth/reenviar-confirmacao", "público"], ["GET", "/api/auth/convite/:token", "público"], ["POST", "/api/auth/convite/:token/registrar", "público"]]}, {"grupo": "Avaliações", "rotas": [["POST", "/api/avaliacoes", "JWT"], ["GET", "/api/paciente/avaliacao-pendente", "JWT"], ["GET", "/api/farmaceutico/me/avaliacoes", "JWT"]]}, {"grupo": "Consulta", "rotas": [["GET", "/api/consulta/:id", "JWT"], ["PATCH", "/api/consulta/:id/iniciar", "JWT"], ["PATCH", "/api/consulta/:id/concluir", "JWT"], ["PATCH", "/api/consulta/:id/cancelar", "JWT"], ["PATCH", "/api/consulta/:id/devolver", "JWT"], ["PATCH", "/api/consulta/:id/salvar-rascunho", "JWT"], ["POST", "/api/consulta/:id/receita/pdf", "JWT"], ["POST", "/api/consulta/:id/encaminhamento/pdf", "JWT"], ["POST", "/api/consulta/:id/recibo/pdf", "JWT"], ["GET", "/api/consulta/:id/detalhes", "JWT"], ["POST", "/api/consulta/:id/anexo-receita", "JWT"], ["GET", "/api/consulta/:id/historico-completo", "JWT"], ["GET", "/api/paciente/:id/historico", "JWT"], ["PATCH", "/api/consulta/:id/sem-contato", "JWT"], ["PATCH", "/api/consulta/:id/remarcar", "JWT"], ["PATCH", "/api/consulta/:id/responder-remarcacao", "JWT"], ["PATCH", "/api/consulta/:id/propor-remarcacao", "JWT"], ["PATCH", "/api/consulta/:id/dispensar-retorno", "JWT"]]}, {"grupo": "Conta", "rotas": [["POST", "/api/conta/alterar-senha", "JWT"]]}, {"grupo": "Dependentes", "rotas": [["GET", "/api/dependentes", "JWT"], ["POST", "/api/dependentes", "JWT"], ["PATCH", "/api/dependentes/:id", "JWT"], ["DELETE", "/api/dependentes/:id", "JWT"], ["GET", "/api/dependentes/:id/saude", "JWT"], ["PATCH", "/api/dependentes/:id/saude", "JWT"]]}, {"grupo": "Fila", "rotas": [["POST", "/api/fila/agendar", "JWT"], ["POST", "/api/fila/urgente", "JWT"], ["GET", "/api/fila/urgente/disponibilidade", "público"], ["GET", "/api/fila/urgente/ativa", "JWT"], ["GET", "/api/fila/urgente/:id", "JWT"], ["POST", "/api/fila/urgente/:id/cancelar", "JWT"], ["POST", "/api/fila/urgente/aborto-triagem", "JWT"], ["POST", "/api/fila/agendadas/:id/cancelar", "JWT"], ["GET", "/api/fila/agendadas", "JWT"], ["GET", "/api/fila/urgentes", "JWT"], ["POST", "/api/fila/agendadas/:id/aceitar", "JWT"], ["POST", "/api/fila/urgente/:id/aceitar", "JWT"]]}, {"grupo": "Lembretes", "rotas": [["GET", "/api/paciente/lembretes", "JWT"], ["POST", "/api/paciente/lembretes", "JWT"], ["PATCH", "/api/paciente/lembretes/:id", "JWT"], ["DELETE", "/api/paciente/lembretes/:id", "JWT"]]}, {"grupo": "Paciente", "rotas": [["POST", "/api/pacientes/perfil", "JWT"], ["GET", "/api/pacientes/perfil", "JWT"], ["PUT", "/api/pacientes/perfil", "JWT"], ["PATCH", "/api/pacientes/perfil", "JWT"], ["GET", "/api/paciente/historico", "JWT"], ["GET", "/api/paciente/agendamentos", "JWT"], ["GET", "/api/pacientes/dados-saude", "JWT"], ["PATCH", "/api/pacientes/dados-saude", "JWT"], ["GET", "/api/paciente/proxima-consulta", "JWT"], ["GET", "/api/paciente/extrato", "JWT"], ["PATCH", "/api/paciente/onboarding/concluir", "JWT"], ["GET", "/api/paciente/notificacoes", "JWT"], ["PATCH", "/api/paciente/notificacoes/marcar-lidas", "JWT"], ["GET", "/api/paciente/consulta/:id/pdf", "JWT"], ["GET", "/api/paciente/consulta/:id", "JWT"], ["GET", "/api/parceiros", "JWT"], ["POST", "/api/parceiros/:id/click", "JWT"], ["GET", "/api/consent/telefarmacia", "JWT"], ["POST", "/api/consent/telefarmacia", "JWT"], ["GET", "/api/lgpd/exportar", "JWT"], ["POST", "/api/lgpd/excluir-conta", "JWT"], ["GET", "/api/paciente/retorno-sugerido", "JWT"], ["GET", "/api/paciente/documentos", "JWT"]]}, {"grupo": "Pagamentos e carteira", "rotas": [["POST", "/api/pagamentos/simular-checkout", "JWT"], ["POST", "/api/pagamentos/:id/confirmar", "JWT"], ["GET", "/api/carteira/saldo", "JWT"], ["POST", "/api/creditos/adicionar-teste", "JWT"]]}, {"grupo": "Farmacêutico", "rotas": [["GET", "/api/pharmacists", "público"], ["GET", "/api/pharmacists/:id/availability", "público"], ["GET", "/api/pharmacists/me/schedule", "JWT"], ["GET", "/api/pharmacists/me/weekly-schedule", "JWT"], ["PUT", "/api/pharmacists/weekly-schedule", "JWT"], ["POST", "/api/pharmacists/availability", "JWT"], ["DELETE", "/api/pharmacists/availability/:id", "JWT"], ["PATCH", "/api/pharmacists/profile", "JWT"], ["POST", "/api/farmaceuticos/cadastro", "JWT"], ["PATCH", "/api/farmaceuticos/me/disponibilidade", "JWT"], ["GET", "/api/farmaceutico/calendario", "JWT"], ["GET", "/api/farmaceutico/consultas", "JWT"], ["GET", "/api/farmaceutico/ganhos", "JWT"], ["GET", "/api/farmaceutico/ganhos/export", "JWT"], ["GET", "/api/farmaceutico/me/metricas", "JWT"], ["GET", "/api/farmaceutico/urgentes-aceitas", "JWT"], ["GET", "/api/farmaceutico/me/repasses", "JWT"], ["GET", "/api/farmaceutico/bloqueios", "JWT"], ["POST", "/api/farmaceutico/bloqueios", "JWT"], ["DELETE", "/api/farmaceutico/bloqueios/:id", "JWT"], ["GET", "/api/farmaceutico/templates", "JWT"], ["POST", "/api/farmaceutico/templates", "JWT"], ["PUT", "/api/farmaceutico/templates/:id", "JWT"], ["DELETE", "/api/farmaceutico/templates/:id", "JWT"]]}, {"grupo": "Público", "rotas": [["GET", "/api/public/stats", "público"]]}, {"grupo": "Push", "rotas": [["GET", "/api/push/vapid-public-key", "público"], ["POST", "/api/push/subscribe", "JWT"], ["DELETE", "/api/push/subscribe", "JWT"], ["POST", "/api/push/test", "JWT"]]}, {"grupo": "Usuário", "rotas": [["POST", "/api/users", "público"], ["GET", "/api/usuario/perfil", "JWT"], ["PATCH", "/api/usuario/perfil", "JWT"]]}, {"grupo": "Webhooks", "rotas": [["POST", "/api/webhooks/mercadopago", "público"]]}];

const ENV_BACKEND = [["DATABASE_URL", "Conexão PostgreSQL"], ["JWT_SECRET", "Assinatura dos tokens (trocar invalida todas as sessões)"], ["PORT / NODE_ENV", "Porta e modo de execução"], ["FRONTEND_URL / BACKEND_URL", "URLs públicas (CORS, links em e-mails, webhooks)"], ["ADMIN_EMAILS", "E-mails com acesso administrativo (somados à lista do painel)"], ["ADMIN_NOTIFICATION_EMAIL", "Destino de avisos administrativos"], ["GOOGLE_CLIENT_ID", "Login com Google (mesmo valor do frontend)"], ["ENCRYPTION_KEY", "Criptografia de dados sensíveis (ex.: segredo TOTP)"], ["VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT", "Web Push"], ["BREVO_API_KEY / SMTP_FROM_EMAIL", "Envio de e-mails"], ["MERCADOPAGO_ACCESS_TOKEN / MERCADOPAGO_WEBHOOK_SECRET", "Pagamentos e validação de webhook"], ["PRECO_CONSULTA_PADRAO", "Preço inicial da consulta"], ["TERMOS_VERSAO / TERMOS_TELEFARMACIA_VERSAO", "Versão vigente dos termos"], ["UPLOAD_DIR", "Diretório de uploads (volume persistente)"], ["SENTRY_DSN", "Monitoramento de erros"]];
const ENV_FRONTEND = [["VITE_API_URL", "URL base da API"], ["VITE_GOOGLE_CLIENT_ID", "Login com Google"], ["VITE_SENTRY_DSN", "Monitoramento de erros no cliente"], ["VITE_TERMOS_TELEFARMACIA_VERSAO", "Versão do termo exibido"]];

const COR = {
  GET: 'bg-success-wash text-success',
  POST: 'bg-brand-wash text-brand-deep',
  PUT: 'bg-alert-wash text-alert',
  PATCH: 'bg-alert-wash text-alert',
  DELETE: 'bg-error-wash text-error',
};

const DocsTecnico = () => (
  <>
    <Secao id="api" titulo="Referência da API">
      <p>
        Base <Code>/api</Code>. Autenticação por <Code>Authorization: Bearer &lt;jwt&gt;</Code>. Rotas
        <strong> admin</strong> exigem e-mail na lista de administradores. Saúde: <Code>GET /api/health</Code>.
      </p>
      {API.map((g) => (
        <details key={g.grupo} className="border border-line rounded-xl bg-surface">
          <summary className="cursor-pointer px-4 py-3 font-semibold text-ink">
            {g.grupo} <span className="text-muted font-normal text-sm">({g.rotas.length})</span>
          </summary>
          <ul className="px-4 pb-3 space-y-1">
            {g.rotas.map(([m, p, a]) => (
              <li key={m + p} className="flex items-center gap-2 text-[13px] flex-wrap">
                <span className={`w-14 text-center rounded px-1.5 py-0.5 font-bold text-[11px] ${COR[m]}`}>{m}</span>
                <code className="text-ink break-all">{p}</code>
                <span className="text-muted text-xs">· {a}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </Secao>

    <Secao id="ambiente" titulo="Variáveis de ambiente">
      <p className="text-sm text-muted">Nomes apenas — valores nunca devem ser commitados. Ver <Code>.env.example</Code>.</p>
      <h3 className="font-heading font-bold text-base">Backend</h3>
      <Tabela cabecalho={['Variável', 'Uso']} linhas={ENV_BACKEND} />
      <h3 className="font-heading font-bold text-base">Frontend</h3>
      <Tabela cabecalho={['Variável', 'Uso']} linhas={ENV_FRONTEND} />
    </Secao>

    <Secao id="operacoes" titulo="Operação e deploy">
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Antes: <Code>npm test</Code> no backend e <Code>npm run build</Code> no frontend verdes.</li>
        <li>Migrações: <Code>npx prisma migrate deploy</Code> + scripts <Code>backend/scripts/migrate-*.mjs</Code> (colunas fora do schema; idempotentes).</li>
        <li>Migração aditiva antes do código novo; remoção de colunas só depois.</li>
        <li>Depois: <Code>GET /api/health</Code> = 200, login de paciente e farmacêutico, um agendamento ponta a ponta, Sentry limpo.</li>
        <li>Backup: <Code>pg_dump -Fc</Code> diário fora do host, retenção de 30 dias; testar restauração trimestralmente.</li>
        <li>Rotação de segredos: trocar <Code>JWT_SECRET</Code> desloga todos; trocar chaves VAPID invalida inscrições push.</li>
        <li>Não renomear chaves <Code>@Telefarmacia:*</Code> do localStorage (desloga todos os usuários).</li>
      </ul>
      <p className="text-sm text-muted">
        Detalhes completos no repositório: <Code>docs/TECHNICAL.md</Code>, <Code>docs/OPERACOES.md</Code>, <Code>docs/DESIGN.md</Code>.
      </p>
    </Secao>
  </>
);

export default DocsTecnico;
