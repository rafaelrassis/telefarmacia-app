import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Secao, Tabela, Code } from '../components/docs/DocsUI.jsx';


const Lista = ({ itens }) => (
  <ul className="list-disc pl-5 space-y-1.5">
    {itens.map((i, k) => <li key={k}>{i}</li>)}
  </ul>
);

const Card = ({ titulo, children }) => (
  <div className="bg-surface border border-line rounded-2xl p-5">
    <h3 className="font-heading font-bold text-base text-ink mb-2">{titulo}</h3>
    <div className="text-sm text-muted space-y-1.5">{children}</div>
  </div>
);

const INDICE = [
  ['visao-geral', 'Visão geral'],
  ['perfis', 'Perfis de acesso'],
  ['paciente', 'Área do paciente'],
  ['farmaceutico', 'Área do farmacêutico'],
  ['admin', 'Painel administrativo'],
  ['ciclo', 'Ciclo de vida da consulta'],
  ['pagamentos', 'Pagamentos e assinatura'],
  ['automacoes', 'Automações'],
  ['notificacoes', 'Notificações'],
  ['seguranca', 'Segurança e LGPD'],
  ['arquitetura', 'Arquitetura'],
  ['dados', 'Modelo de dados'],
];

const DocumentacaoPage = () => {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const indice = INDICE;

  return (
    <div className="bg-canvas min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-wash border border-brand/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-brand-deep" />
            </div>
            <p className="font-body font-semibold text-xs uppercase tracking-wide text-brand-deep">Documentação</p>
          </div>
          <h1 className="font-heading font-extrabold text-[27px] text-ink">Como o FarmaConsulta funciona</h1>
          <p className="text-muted mt-2 max-w-2xl">
            Referência completa da plataforma: funcionalidades por perfil, regras de negócio, automações,
            segurança e arquitetura.
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <nav className="mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-24 bg-surface border border-line rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Nesta página</p>
              <ul className="space-y-1 text-sm">
                {indice.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block px-2 py-1 rounded-lg text-ink hover:bg-brand-wash hover:text-brand-deep transition">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <main className="min-w-0">
            <Secao id="visao-geral" titulo="Visão geral">
              <p>
                O FarmaConsulta é uma plataforma de telefarmácia (PWA instalável) que conecta pacientes a
                farmacêuticos clínicos com CRF verificado, para orientação sobre medicamentos isentos de
                prescrição (MIP), interpretação de receitas e acompanhamento farmacoterapêutico.
              </p>
              <p>
                O atendimento funciona por <strong>fila</strong>, não por agenda rígida: o paciente faz a triagem,
                escolhe entre consulta <strong>agendada</strong> (data/horário) ou <strong>urgente</strong> (próximo
                farmacêutico disponível), paga com créditos da carteira ou assinatura, e o farmacêutico conduz o
                atendimento pelo WhatsApp. Ao final, receita, orientações e encaminhamento ficam disponíveis em PDF.
              </p>
              <div className="bg-alert-wash border border-alert/30 rounded-xl p-4 text-sm">
                As consultas não substituem avaliação ou prescrição médica. Casos com sinais de alarme são
                direcionados a atendimento de emergência já na triagem.
              </div>
            </Secao>

            <Secao id="perfis" titulo="Perfis de acesso">
              <div className="grid sm:grid-cols-3 gap-4">
                <Card titulo="Paciente">
                  <p>Cadastro por e-mail/senha ou Google. Pode gerenciar dependentes e agendar consultas para eles.</p>
                </Card>
                <Card titulo="Farmacêutico">
                  <p>Cadastro com envio de documentos (CRF) ou por convite. Só atende após aprovação do admin.</p>
                </Card>
                <Card titulo="Administrador">
                  <p>Acesso concedido pela equipe do FarmaConsulta. Um usuário pode alternar entre ambientes.</p>
                </Card>
              </div>
              <p>
                Usuários com mais de um ambiente disponível (ex.: farmacêutico que também é admin) escolhem o
                ambiente em <Code>/selecionar-perfil</Code>.
              </p>
            </Secao>

            <Secao id="paciente" titulo="Área do paciente">
              <Lista itens={[
                'Triagem guiada: motivo, sintomas, histórico, uso de medicamentos, receita (opcional) e alerta de emergência.',
                'Agendamento: consulta agendada (escolha de data/horário) ou urgente (entra na fila imediata).',
                'Dependentes: cadastro de familiares com dados de saúde próprios; consultas podem ser feitas em nome deles.',
                'Dados de saúde: alergias, condições e medicamentos de uso contínuo, compartilhados com o farmacêutico.',
                'Próxima consulta, remarcação (até 2 por consulta) e resposta a propostas de nova data do farmacêutico.',
                'Meus documentos: receitas, encaminhamentos e recibos em PDF.',
                'Retorno sugerido pelo farmacêutico, com atalho para reagendar ou dispensar.',
                'Lembretes de medicação com notificação push nos horários configurados.',
                'Carteira de créditos com extrato e assinatura mensal.',
                'Avaliação do atendimento (nota e comentário) após a conclusão.',
                'Onde comprar: farmácias parceiras sugeridas (quando habilitado pelo admin).',
                'LGPD: exportação dos próprios dados e exclusão de conta.',
              ]} />
            </Secao>

            <Secao id="farmaceutico" titulo="Área do farmacêutico">
              <Lista itens={[
                'Cadastro em etapas com upload de documentos; status pendente até aprovação.',
                'Disponibilidade online/offline (ping periódico) para receber urgentes.',
                'Fila: consultas agendadas e urgentes aguardando aceite.',
                'Agenda semanal, calendário e bloqueios de horário (férias, compromissos).',
                'Atendimento: triagem do paciente, histórico clínico, orientações, receita e encaminhamento.',
                'Conclusão gera os PDFs automaticamente; contato com o paciente por um único botão de WhatsApp.',
                'Ações: devolver à fila, registrar tentativa sem contato, propor remarcação, salvar rascunho.',
                'Templates de orientação reutilizáveis.',
                'Métricas, avaliações recebidas, ganhos (com exportação CSV) e repasses.',
              ]} />
            </Secao>

            <Secao id="admin" titulo="Painel administrativo">
              <Lista itens={[
                'Visão geral e operação: fila em tempo real, consultas, métricas.',
                'Farmacêuticos: aprovação de cadastros, documentos, suspensão/reativação, ocorrências, convites.',
                'Pacientes: listagem, exclusão e ajuste manual de carteira.',
                'Horários do sistema e abertura/fechamento da plataforma.',
                'Financeiro: preço da consulta, comissão padrão e individual, visão financeira e repasses (com exportação).',
                'Plano de assinatura mensal e configuração de trial promocional.',
                'Parceiros (farmácias) com métricas de cliques; ativação do “Onde comprar”.',
                'Avaliações, administradores, logs e trilha de auditoria de ações administrativas.',
              ]} />
            </Secao>

            <Secao id="ciclo" titulo="Ciclo de vida da consulta">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {['aguardando', 'aceito', 'em_atendimento', 'concluido'].map((s, i, a) => (
                  <React.Fragment key={s}>
                    <span className="px-2.5 py-1 rounded-lg bg-brand-wash text-brand-deep font-medium">{s}</span>
                    {i < a.length - 1 && <span className="text-muted">→</span>}
                  </React.Fragment>
                ))}
                <span className="text-muted">ou</span>
                <span className="px-2.5 py-1 rounded-lg bg-error-wash text-error font-medium">cancelado</span>
              </div>
              <Tabela
                cabecalho={['Etapa', 'O que acontece']}
                linhas={[
                  ['Criação', 'Paciente conclui a triagem; o crédito é debitado e a consulta entra na fila (agendada ou urgente).'],
                  ['Aceite', 'Um farmacêutico aprovado assume a consulta.'],
                  ['Início', 'Farmacêutico inicia o atendimento e contata o paciente pelo WhatsApp.'],
                  ['Conclusão', 'Orientações, receita, retorno sugerido e encaminhamento são salvos; PDFs gerados automaticamente.'],
                  ['Cancelamento', 'Pelo paciente, pelo farmacêutico, por falta de contato ou por expiração automática — sempre com estorno do crédito.'],
                  ['Devolução', 'Farmacêutico devolve a consulta à fila para outro profissional.'],
                ]}
              />
            </Secao>

            <Secao id="pagamentos" titulo="Pagamentos e assinatura">
              <Lista itens={[
                'Carteira de créditos por paciente, com extrato de transações (débito, estorno, recarga, ajuste).',
                'Recarga via PIX pelo Mercado Pago, confirmada por webhook com validação de assinatura.',
                'Assinatura mensal: plano com N consultas/mês configurável pelo admin; status ativa, trial, inadimplente ou cancelada.',
                'Trial promocional configurável: dias grátis ou desconto percentual.',
                'Preço da consulta e comissões definidos no painel; repasses aos farmacêuticos registrados pelo admin.',
              ]} />
            </Secao>

            <Secao id="automacoes" titulo="Automações (tarefas agendadas)">
              <Tabela
                cabecalho={['Frequência', 'Tarefa']}
                linhas={[
                  ['5 min', 'Expira urgentes sem aceite e estorna o crédito.'],
                  ['5 min', 'Urgentes aceitas sem início: alerta e, após o limite, cancela com estorno.'],
                  ['5 min', 'Dispara lembretes de medicação.'],
                  ['15 min', 'Cancela agendadas cujo horário + tolerância já passou (com estorno).'],
                  ['15 min', 'Envia lembrete push ~1h antes da consulta agendada.'],
                  ['30 min', 'Alerta atendimentos em andamento há mais de 4h.'],
                  ['1 h', 'Exclui cadastros não confirmados há mais de 24h (sem consultas/pagamentos).'],
                  ['Diário, 3h', 'Expira trials, marca assinaturas inadimplentes e finaliza canceladas.'],
                ]}
              />
              <p className="text-sm text-muted">Horários em America/Sao_Paulo. Limites de tempo são configuráveis no painel.</p>
            </Secao>

            <Secao id="notificacoes" titulo="Notificações">
              <Lista itens={[
                'Push (Web Push/VAPID) via service worker: novas consultas na fila, aceite, lembretes e medicação.',
                'Central de notificações no app (sino) com marcação de lidas.',
                'E-mail transacional: confirmação de cadastro, recuperação de senha e avisos administrativos.',
                <>No iPhone, push exige o app instalado na Tela de Início. Ajuda em <Link to="/ajuda/notificacoes" className="text-brand-deep underline">/ajuda/notificacoes</Link>.</>,
              ]} />
            </Secao>

            <Secao id="seguranca" titulo="Segurança e LGPD">
              <Lista itens={[
                'Autenticação por JWT; tokens antigos invalidados após troca ou redefinição de senha.',
                'Login com Google ou e-mail/senha com confirmação de e-mail obrigatória.',
                '2FA opcional (TOTP) com códigos de backup.',
                'Rate limiting em login, recuperação de senha, confirmação de e-mail e 2FA.',
                'Cabeçalhos de segurança (Helmet), CORS restrito e ID de requisição para rastreio de erros.',
                'Termo de consentimento de telefarmácia versionado e registrado por usuário.',
                'Exportação de dados e exclusão de conta pelo próprio titular.',
                'Fontes auto-hospedadas (sem CDN de terceiros) e monitoramento de erros com Sentry.',
              ]} />
            </Secao>

            <Secao id="arquitetura" titulo="Arquitetura">
              <Tabela
                cabecalho={['Camada', 'Tecnologia']}
                linhas={[
                  ['Frontend', 'React 18, Vite 5, Tailwind CSS v4, React Router v7, PWA (Workbox)'],
                  ['Backend', 'Node.js (ESM), Express 5, Prisma ORM v5, node-cron'],
                  ['Banco', 'PostgreSQL 15'],
                  ['Auth', 'JWT, Google OAuth 2.0, TOTP'],
                  ['Arquivos', 'Upload com Multer em volume persistente; PDFs com PDFKit'],
                  ['Integrações', 'Mercado Pago (PIX/assinatura), Web Push, SMTP/Brevo, Sentry'],
                  ['Infra', 'Frontend na Vercel; backend e banco no Railway'],
                  ['Qualidade', 'Vitest + Supertest, GitHub Actions'],
                ]}
              />
              <p>
                Monorepo com <Code>frontend/</Code> e <Code>backend/</Code> independentes, comunicando só via API REST
                (JSON + Bearer JWT). Sem SSR nem WebSockets: dados em tempo real por polling.
              </p>
            </Secao>

            <Secao id="dados" titulo="Modelo de dados">
              <Tabela
                cabecalho={['Domínio', 'Entidades']}
                linhas={[
                  ['Usuários', 'User, PacienteProfile, PharmacistProfile, DependentProfile, FarmaceuticoStatus'],
                  ['Conta', 'VerificationToken, PasswordReset, PushSubscription, ConsentRecord'],
                  ['Atendimento', 'FilaAgendada, FilaUrgente, Avaliacao, TemplateOrientacao'],
                  ['Agenda', 'WeeklySchedule, Availability, BloqueioAgenda, SistemaHorario'],
                  ['Financeiro', 'Carteira, TransacaoCarteira, Pagamento, Plano, Assinatura, PromoTrial, Repasse, RepasseItem'],
                  ['Paciente', 'LembreteMedicacao, Notificacao'],
                  ['Parceiros', 'PartnerPharmacy, AffiliateClick'],
                  ['Administração', 'SystemConfig, ConviteFarmaceutico, AdminAuditLog'],
                ]}
              />
            </Secao>

            {isAdmin && (
              <div className="flex gap-3 items-start bg-surface border border-line rounded-2xl p-5 text-sm text-muted">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Endpoints, variáveis de ambiente e detalhes internos estão no{' '}
                  <Link to="/dashboard" className="text-brand-deep underline">Painel admin → Sistema → Doc. técnica</Link>.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DocumentacaoPage;
