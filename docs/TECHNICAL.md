# Documentação Técnica — FarmaConsulta

## Índice

1. [Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
2. [Backend](#2-backend)
   - 2.1 [Entry point e inicialização](#21-entry-point-e-inicialização)
   - 2.2 [Autenticação e autorização](#22-autenticação-e-autorização)
   - 2.3 [Rotas e controllers](#23-rotas-e-controllers)
   - 2.4 [Serviços externos](#24-serviços-externos)
   - 2.5 [Tarefas agendadas (cron)](#25-tarefas-agendadas-cron)
3. [Banco de dados](#3-banco-de-dados)
   - 3.1 [Schema Prisma](#31-schema-prisma)
   - 3.2 [Campos raw (fora do schema)](#32-campos-raw-fora-do-schema)
   - 3.3 [Diagrama de entidades](#33-diagrama-de-entidades)
   - 3.4 [Migrations](#34-migrations)
4. [Frontend](#4-frontend)
   - 4.1 [Estrutura de rotas](#41-estrutura-de-rotas)
   - 4.2 [AuthContext](#42-authcontext)
   - 4.3 [Componentes principais](#43-componentes-principais)
   - 4.4 [PWA](#44-pwa)
5. [Fluxos de dados](#5-fluxos-de-dados)
   - 5.1 [Autenticação](#51-autenticação)
   - 5.2 [Consulta agendada](#52-consulta-agendada)
   - 5.3 [Consulta urgente](#53-consulta-urgente)
   - 5.4 [Ciclo de vida de uma consulta (fila)](#54-ciclo-de-vida-de-uma-consulta-fila)
   - 5.5 [Emissão e distribuição de receita](#55-emissão-e-distribuição-de-receita)
   - 5.6 [Pagamentos e carteira](#56-pagamentos-e-carteira)
6. [Modelo de segurança](#6-modelo-de-segurança)
   - 6.1 [Isolamento de dados entre usuários](#61-isolamento-de-dados-entre-usuários)
   - 6.2 [Rate limiting](#62-rate-limiting)
   - 6.3 [LGPD](#63-lgpd)
7. [Variáveis de ambiente](#7-variáveis-de-ambiente)
8. [Scripts de manutenção](#8-scripts-de-manutenção)

---

## 1. Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                         Cliente                             │
│  React 18 SPA (Vite 5 · Tailwind v4 · React Router v7)     │
│  PWA instalável (vite-plugin-pwa)                           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / JSON  (Bearer JWT)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Node.js ESM)                   │
│  Express 5  ·  Prisma ORM v5  ·  node-cron                 │
│                                                             │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────────────┐ │
│  │  Routes  │→ │Controllers │→ │  Prisma Client + rawSQL │ │
│  └──────────┘  └────────────┘  └────────────┬────────────┘ │
│                                             │               │
│  ┌───────────────────┐                      │               │
│  │  Services         │                      │               │
│  │  · emailService   │                      │               │
│  └───────────────────┘                      │               │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                         ┌────────────────────▼──────────────┐
                         │        PostgreSQL 15               │
                         │  (Prisma migrations + raw fields)  │
                         └───────────────────────────────────┘
```

A aplicação é um monorepo com dois projetos independentes (`backend/` e `frontend/`) que se comunicam exclusivamente via API REST. Não há SSR nem WebSockets — todo estado em tempo real é obtido por polling ou recarregamento manual.

---

## 2. Backend

### 2.1 Entry point e inicialização

**`backend/server.js`**

```
node server.js
  └── import app from './src/app.js'
  └── app.listen(PORT)
  └── initCronJobs()        ← registra jobs de manutenção
```

**`backend/src/app.js`**

Configura, na ordem:

1. CORS — lista de origens permitidas lida de `FRONTEND_URL` (suporta múltiplas origens separadas por vírgula)
2. `express.json()` + `express.urlencoded()`
3. Rate limiters (instâncias independentes por grupo de rotas)
4. Servir arquivos de upload em `/uploads` (estático)
5. `GET /api/health` — health check sem autenticação
6. Todas as rotas prefixadas em `/api`
7. Handler 404 global

O backend usa `"type": "module"` (ESM nativo). Todos os imports usam extensão `.js` explícita.

---

### 2.2 Autenticação e autorização

#### JWT

O token é gerado no login com payload `{ id, email, role, isAdmin }` e verificado pelo `authMiddleware`:

```js
// src/middlewares/authMiddleware.js
jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
  req.user = user;   // { id, email, role, isAdmin }
  next();
});
```

O frontend armazena o token em `localStorage` sob a chave `@Telefarmacia:token` e o envia em cada requisição como `Authorization: Bearer <token>`.

#### Google OAuth

O fluxo usa `google-auth-library` para verificar o `id_token` enviado pelo frontend (obtido via `@react-oauth/google`). Se o usuário não existir, é criado automaticamente. Se existir com e-mail/senha, o `googleId` é vinculado ao cadastro existente.

#### Guarda de roles

Cada controller verifica `req.user.role` para proteger recursos:

```js
if (req.user.role !== 'FARMACEUTICO') return res.status(403).json({ error: '...' });
if (req.user.role !== 'PACIENTE')     return res.status(403).json({ error: '...' });
```

Rotas administrativas usam `adminMiddleware` em camada adicional:

```js
// src/middlewares/adminMiddleware.js
if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso restrito.' });
```

---

### 2.3 Rotas e controllers

#### `/api/auth` — AuthController

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criação de conta com e-mail/senha |
| POST | `/auth/login` | Login com e-mail/senha → retorna JWT |
| POST | `/auth/google` | Login/cadastro via Google OAuth |
| GET | `/auth/me` | Retorna dados do usuário autenticado |
| PUT | `/auth/onboarding` | Marca `onboardingConcluido` no perfil |

Rate limiter: 20 tentativas por IP a cada 15 min.

---

#### `/api` — PharmacistController

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| PATCH | `/pharmacists/profile` | Sim | Atualiza bio e tags |
| POST | `/farmaceuticos/cadastro` | Sim | Upload de documentos CRF + identidade |
| PATCH | `/farmaceuticos/me/disponibilidade` | Sim | Toggle online/offline |
| GET | `/farmaceutico/calendario` | Sim | Consultas aceitas (visão calendário) |
| GET | `/farmaceutico/consultas` | Sim | Histórico de consultas com filtros e paginação |
| GET | `/farmaceutico/ganhos` | Sim | Relatório financeiro por período |
| GET | `/farmaceutico/urgentes-aceitas` | Sim | Urgentes em andamento |

---

#### `/api` — PacienteController

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/pacientes/perfil` | Cria perfil clínico do paciente |
| GET | `/pacientes/perfil` | Retorna perfil + lista de dependentes |
| PUT | `/pacientes/perfil` | Atualiza dados pessoais |
| GET | `/paciente/historico` | Consultas concluídas (MyAppointments) |
| GET | `/paciente/agendamentos` | Consultas ativas/agendadas |
| GET | `/pacientes/dados-saude` | Dados de saúde do titular |
| PATCH | `/pacientes/dados-saude` | Salva dados de saúde do titular |
| GET | `/paciente/proxima-consulta` | Próxima consulta agendada |
| GET | `/paciente/extrato` | Extrato de transações da carteira |
| PATCH | `/paciente/onboarding/concluir` | Finaliza onboarding |
| GET | `/paciente/notificacoes` | Notificações do usuário |
| PATCH | `/paciente/notificacoes/marcar-lidas` | Marca notificações como lidas |
| GET | `/paciente/consulta/:id/pdf` | Baixa PDF da receita (autenticado) |
| GET | `/paciente/consulta/:id` | Detalhes de uma consulta (visão paciente) |
| GET | `/paciente/documentos` | Todas as receitas e orientações de consultas concluídas |
| GET | `/paciente/retorno-sugerido` | Retorno sugerido pelo farmacêutico pendente de resposta |

---

#### `/api` — FilaController

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/fila/agendar` | Entra na fila agendada (debita crédito) |
| POST | `/fila/urgente` | Entra na fila urgente |
| GET | `/fila/urgente/ativa` | Status da urgente ativa do paciente |
| GET | `/fila/urgente/:id` | Status de urgente específica |
| POST | `/fila/urgente/:id/cancelar` | Cancela urgente (devolve crédito) |
| POST | `/fila/agendadas/:id/cancelar` | Cancela agendada (devolve crédito) |
| GET | `/fila/agendadas` | Lista agendadas aguardando (farmacêutico) |
| GET | `/fila/urgentes` | Lista urgentes aguardando (farmacêutico) |
| POST | `/fila/agendadas/:id/aceitar` | Farmacêutico aceita agendada |
| POST | `/fila/urgente/:id/aceitar` | Farmacêutico aceita urgente |

---

#### `/api` — ConsultaController

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/consulta/:id` | Dados completos da consulta (farmacêutico) |
| PATCH | `/consulta/:id/iniciar` | Marca consulta como iniciada |
| PATCH | `/consulta/:id/concluir` | Conclui consulta (salva observações, retorno sugerido) |
| PATCH | `/consulta/:id/cancelar` | Cancela e devolve crédito |
| PATCH | `/consulta/:id/devolver` | Farmacêutico devolve consulta à fila |
| PATCH | `/consulta/:id/salvar-rascunho` | Salva rascunho sem concluir |
| POST | `/consulta/:id/receita/pdf` | Gera PDF da receita (PDFKit) |
| GET | `/consulta/:id/detalhes` | Detalhes resumidos (paciente + farmacêutico) |
| GET | `/consulta/:id/historico-completo` | Histórico clínico completo do paciente |
| GET | `/paciente/:id/historico` | Histórico público de consultas de um paciente |
| PATCH | `/consulta/:id/sem-contato` | Marca sem contato (farmacêutico) |
| PATCH | `/consulta/:id/remarcar` | Paciente solicita remarcação |
| PATCH | `/consulta/:id/responder-remarcacao` | Paciente aceita/recusa proposta |
| PATCH | `/consulta/:id/propor-remarcacao` | Farmacêutico propõe nova data |
| PATCH | `/consulta/:id/dispensar-retorno` | Paciente dispensa retorno sugerido |

---

#### `/api` — DependentController

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dependentes` | Lista dependentes ativos do titular |
| POST | `/dependentes` | Cria dependente (requer `aceitouResponsabilidade: true`) |
| PATCH | `/dependentes/:id` | Atualiza dados do dependente |
| DELETE | `/dependentes/:id` | Soft-delete (`ativo: false`) |
| GET | `/dependentes/:id/saude` | Dados de saúde do dependente |
| PATCH | `/dependentes/:id/saude` | Salva dados de saúde do dependente |

---

#### Demais rotas

| Grupo | Prefixo | Descrição |
|-------|---------|-----------|
| Avaliação | `/avaliacoes` | CRUD de avaliações pós-consulta |
| Pagamento (carteira) | `/pagamentos` | PIX mock + crédito em carteira |
| Admin | `/admin` | Aprovação de farmacêuticos, config do sistema |
| Parceiros | `/parceiros` | Farmácias afiliadas (flag-gated) |
| Consentimento | `/consent/telefarmacia` | Aceite do termo de teleconsulta |
| LGPD | `/lgpd/exportar`, `/lgpd/excluir-conta` | Direitos do titular |

---

### 2.4 Serviços externos

#### E-mail (`src/services/emailService.js`)

Usa Nodemailer com transporte SMTP configurável. Se `SMTP_HOST` não estiver definido, as funções registram aviso e retornam silenciosamente (não lançam exceção). Eventos disparados:

- `notifyAdminNewPharmacist` — novo farmacêutico enviou documentos para aprovação

#### PDFKit

Geração de receita farmacêutica em PDF server-side. O PDF é salvo em disco (diretório `UPLOAD_DIR`) e o caminho é armazenado no campo raw `receita_pdf_url` da tabela `FilaAgendada` / `FilaUrgente`. O download é sempre autenticado — nunca há URL pública.

---

### 2.5 Tarefas agendadas (cron)

```js
// src/cronJobs.js
// A cada 5 min: urgentes aguardando há mais de N min sem farmacêutico aceitar → estorno
// A cada 5 min: urgentes aceitas sem início (alerta em 30min, cancela com estorno em 60min)
// A cada 30 min: atendimentos (fila) em andamento há mais de 4h → alerta
```

Todo o ciclo de vida das consultas (`FilaAgendada`, `FilaUrgente`) é controlado pelos jobs acima, que rodam sobre os próprios status da fila (`aguardando`, `aceito`, `em_atendimento`).

---

## 3. Banco de dados

### 3.1 Schema Prisma

#### `User`
Usuário central. Pode ter role `PACIENTE` ou `FARMACEUTICO`. A flag `isAdmin` não existe no schema — é derivada do campo `adminEmails` em `SystemConfig` ou verificada por lista de e-mails no `adminMiddleware`.

Relações:
- `1:1` com `PacienteProfile` ou `PharmacistProfile`
- `1:1` com `Carteira`
- `1:N` com `FilaAgendada`, `FilaUrgente`, `Notificacao`, `DependentProfile`, `ConsentRecord`

#### `PacienteProfile`
Dados clínicos e pessoais do paciente. Campos de endereço são opcionais (preenchidos no onboarding). `onboardingConcluido` é `false` até o paciente completar o wizard de 3 etapas.

#### `PharmacistProfile`
Dados profissionais. `isApproved` começa em `false` — o farmacêutico só aparece na listagem após aprovação pelo admin. `isOnline` é controlado manualmente pelo farmacêutico via toggle no dashboard.

#### `FilaAgendada`
Consulta com data/hora marcada. Campos de estado: `status` (`aguardando` → `em_andamento` → `concluido` | `cancelado` | `devolvido`). O campo `dependentId` é nulo quando a consulta é para o titular.

#### `FilaUrgente`
Consulta sem agendamento. O paciente entra na fila e aguarda um farmacêutico online aceitar. `aceitoEm` registra o momento em que o farmacêutico aceitou.

#### `Carteira` + `TransacaoCarteira`
Carteira virtual do paciente. O saldo é debitado ao entrar na fila e creditado ao cancelar ou quando o farmacêutico devolve. Todas as movimentações ficam em `TransacaoCarteira` com `saldoApos` para reconstruir o histórico.

#### `DependentProfile`
Dependente vinculado a um titular (`ownerId`). Soft-delete via `ativo: false`. `dadosSaude` é um campo `Json` sem schema fixo (mesmo padrão dos dados de saúde do titular). `aceitouResponsabilidade` deve ser `true` — validado no backend.

#### `Avaliacao`
Avaliação pós-consulta. Pode estar vinculada a `FilaAgendada` ou `FilaUrgente` (apenas um dos dois ao mesmo tempo, o outro fica `null`).

#### `FarmaceuticoStatus`
Tabela separada de status online/offline para evitar lock na tabela `User`. `ultimoPing` é atualizado a cada interação para detectar desconexões.

#### `PartnerPharmacy` + `AffiliateClick`
Farmácias parceiras com link de afiliado. `AffiliateClick` registra cada clique para relatório de conversão.

#### `ConsentRecord`
Registro imutável de aceite de termos. `@@unique([userId, tipoTermo, versaoTermo])` garante que o mesmo termo não seja aceito duas vezes. `ip` armazena o IP do usuário no momento do aceite (art. 7º LGPD).

#### `Notificacao`
Notificações in-app. `lida: false` até o paciente abrir o painel. `consultaId` é opcional — usado para navegação direta.

#### `SystemConfig`
Tabela chave-valor para configurações globais do sistema (ex.: horário de funcionamento, flags de feature).

#### `SistemaHorario`
Horário de funcionamento por dia da semana. Usado pelo frontend para exibir aviso de fora do horário.

---

### 3.2 Campos raw (fora do schema)

As tabelas `FilaAgendada` e `FilaUrgente` têm colunas adicionadas via migrations manuais (`.mjs`) que **não estão no schema Prisma** — são acessadas exclusivamente via `prisma.$queryRawUnsafe`:

| Coluna | Tabela | Tipo | Conteúdo |
|--------|--------|------|----------|
| `triagem` | ambas | `JSONB` | Dados do formulário de triagem preenchido pelo paciente |
| `observacoes` | ambas | `TEXT` | Orientações escritas pelo farmacêutico |
| `receita` | ambas | `JSONB` | Itens da receita (array de medicamentos) |
| `receita_pdf_url` | ambas | `TEXT` | Caminho relativo do PDF no servidor |
| `motivo` | ambas | `TEXT` | Motivo principal da consulta (do formulário de triagem) |
| `finalizacao` | ambas | `JSONB` | Dados de finalização: retorno sugerido, observações de alta |

> **Importante:** Ao fazer queries raw, o PostgreSQL retorna os aliases em **letras minúsculas** (ex.: `r.data_hora`, `r.has_receita`). O código acessa sempre com `.toLowerCase()` ou alias explícito.

---

### 3.3 Diagrama de entidades

```
User ──────────────────────────────────────────────────────────
 │
 ├─ 1:1 ─ PacienteProfile
 │          └─ (dados pessoais + onboarding)
 │
 ├─ 1:1 ─ PharmacistProfile
 │          └─ (CRF, bio, preço, documentos)
 │
 ├─ 1:1 ─ FarmaceuticoStatus (online/ping)
 │
 ├─ 1:1 ─ Carteira
 │          └─ 1:N ─ TransacaoCarteira
 │
 ├─ 1:N ─ DependentProfile
 │          ├─ 1:N ─ FilaAgendada (como dependent)
 │          └─ 1:N ─ FilaUrgente  (como dependent)
 │
 ├─ 1:N ─ FilaAgendada (como paciente ou farmacêutico)
 │          ├─ campos raw: triagem, observacoes, receita, receita_pdf_url, motivo, finalizacao
 │          └─ 1:1 ─ Avaliacao
 │
 ├─ 1:N ─ FilaUrgente (como paciente ou farmacêutico)
 │          ├─ campos raw: triagem, observacoes, receita, receita_pdf_url, motivo, finalizacao
 │          └─ 1:1 ─ Avaliacao
 │
 ├─ 1:N ─ Pagamento (legado)
 ├─ 1:N ─ Notificacao
 └─ 1:N ─ ConsentRecord

Tabelas independentes:
  SystemConfig       (chave-valor global)
  SistemaHorario     (grade de horário de funcionamento)
  PartnerPharmacy ── 1:N ── AffiliateClick
```

---

### 3.4 Migrations

| Arquivo | Conteúdo |
|---------|----------|
| `20260618000000_init` | Schema inicial completo |
| `20260618010000_add_calendar_url` | Adiciona `calendarEmbedUrl` em PharmacistProfile |
| `20260617190549_adicionar_disponibilidade` | Modelo Availability, WeeklySchedule |
| `20260703100418_avaliacao_fila_extrato_carteira` | Avaliacao, Carteira, TransacaoCarteira, FilaAgendada, FilaUrgente |
| `20260703101602_onboarding_notificacoes` | Onboarding flags, Notificacao |
| `20260703200000_parceiros_afiliados` | PartnerPharmacy, AffiliateClick |
| `20260703220000_consent_record` | ConsentRecord |
| `20260703230000_whatsapp_remarcacao_retorno` | Campos de remarcação e retorno sugerido |
| `20260706172558_remove_legacy_agendamento_flow` | Remove `Appointment`, `Availability`, `WeeklySchedule`, enum `AppointmentStatus` e `PharmacistProfile.calendarEmbedUrl` — fluxo de agendamento por farmacêutico específico foi descontinuado em favor do sistema de filas |

Scripts manuais em `backend/scripts/` adicionam as colunas raw (`triagem`, `observacoes`, `receita`, `receita_pdf_url`, `motivo`, `finalizacao`) com `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

---

## 4. Frontend

### 4.1 Estrutura de rotas

```
/                    LandingPage        (pública)
/entrar              LoginPage          (pública)
/selecionar-perfil   SelecionarPerfilPage  (pós-login, múltiplos ambientes)
/dashboard           DashboardPage      (autenticada)
*                    → redirect para /
```

`DashboardPage` renderiza condicionalmente:
- `PatientDashboard` quando `activeEnv === 'patient'`
- `PharmacistDashboard` quando `activeEnv === 'pharmacist'`
- `AdminPanel` quando `activeEnv === 'admin'`

---

### 4.2 AuthContext

`src/context/AuthContext.jsx` gerencia todo o estado de sessão:

```
localStorage:
  @Telefarmacia:token   →  JWT string
  @Telefarmacia:user    →  JSON do objeto user
  @Telefarmacia:env     →  'patient' | 'pharmacist' | 'admin'
```

**Propriedades expostas:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `user` | `Object \| null` | Dados do usuário autenticado |
| `token` | `String \| null` | JWT atual |
| `activeEnv` | `String \| null` | Ambiente ativo |
| `needsEnvSelection` | `Boolean` | Exibe seletor de ambiente |
| `availableEnvs` | `String[]` | Ambientes disponíveis para o usuário |

**Fluxo de login:**
1. `login(token, userData)` é chamado após resposta da API
2. Se usuário tem apenas um ambiente (paciente puro): entra direto em `patient`
3. Se usuário tem múltiplos ambientes: exibe `SelecionarPerfilPage`
4. Preferência de ambiente é persistida no localStorage para próximas sessões

---

### 4.3 Componentes principais

#### PatientDashboard
Dashboard central do paciente. Renderiza:
- Cartão de saldo + botão de recarga
- Próxima consulta agendada
- Minhas consultas (histórico, agendamentos ativos)
- Acesso rápido: Meus Documentos, Extrato, Onde Comprar

**Modais gerados dentro do PatientDashboard:**
- `MeusDocumentos` — bottom-sheet com filtro por pessoa + busca
- `ReceitaViewer` — visualizador de receita com compartilhamento
- `ExcluirContaModal` — confirmação de exclusão de conta

#### PharmacistDashboard
Dashboard do farmacêutico. Tabs:
- **Calendário** — visão semanal das consultas de fila aceitas (agendadas e urgentes)
- **Consultas** — histórico com filtros e paginação
- **Ganhos** — relatório financeiro

#### TriagemForm
Formulário pré-consulta preenchido pelo paciente antes de ser atendido. Campos:
- Tipo de consulta (`tratamento` | `interpretacao_receita`)
- Motivo principal
- Medicamentos em uso
- Condições de saúde
- Alergias
- Upload de documentos (foto de receita, exames)

#### ConsultaModal
Tela principal do farmacêutico durante o atendimento. Exibe:
- Dados do paciente + triagem
- Formulário de observações e receita
- Botões de ação: iniciar, salvar rascunho, concluir, devolver, sem contato

#### ReceitaViewer
Visualizador de receita/orientações. Funcionalidades:
- Renderiza receita em formato legível
- Download autenticado do PDF
- Compartilhamento via Web Share API (nativo do dispositivo, sem URL pública)

#### MeusDocumentos
Bottom-sheet com todas as receitas e orientações do paciente:
- Filtro por pessoa (titular / dependente específico / todos)
- Busca client-side por nome, farmacêutico, motivo, observações
- Cards clicáveis que abrem o ReceitaViewer

#### TermoConsentimento
Modal de aceite do termo de teleconsulta farmacêutica. Disparado automaticamente no primeiro acesso ao dashboard se o consentimento ainda não foi registrado. Bloqueia o uso até aceite.

#### OnboardingSlider
Wizard de onboarding em 3 etapas disparado para pacientes sem `onboardingConcluido`:
1. Dados pessoais (nome, CPF, data de nascimento, gênero, telefone, endereço)
2. Dados de saúde (condições crônicas, alergias, medicamentos)
3. Aceite de termos + LGPD

---

### 4.4 PWA

Configurado via `vite-plugin-pwa`. Manifesto com:
- `name: "FarmaConsulta"`
- Ícones em 192px e 512px (SVG)
- `display: standalone`
- `theme_color: #1d4ed8`

`PWAReloadPrompt` exibe banner quando há nova versão disponível para instalar.

---

## 5. Fluxos de dados

### 5.1 Autenticação

```
[Frontend]                        [Backend]
   │
   ├─ POST /auth/login             ──►  Verifica bcrypt
   │   { email, password }              Gera JWT
   │                               ◄──  { token, user }
   │
   ├─ POST /auth/google            ──►  Verifica id_token (google-auth-library)
   │   { idToken }                      Cria/vincula User
   │                               ◄──  { token, user }
   │
   └─ Todas as demais requisições
       Authorization: Bearer <token>
       authMiddleware → req.user = { id, email, role }
```

---

### 5.2 Consulta agendada

```
Paciente                        Backend                         Farmacêutico
   │                               │                               │
   ├─ GET /disponibilidade         │                               │
   │  (horário global do sistema)  │                               │
   │                            ◄──┘                               │
   │                               │                               │
   ├─ POST /fila/agendar           │                               │
   │  { data_hora, triagem,        │                               │
   │    dependentId?,              │                               │
   │    whatsapp_contato,          │                               │
   │    modalidade_atend }      ──►│ Cria FilaAgendada             │
   │                               │ Debita crédito da Carteira    │
   │                            ◄──┤ { id, status: 'aguardando' }  │
   │                               │                               │
   │  (paciente aguarda...)        │   GET /fila/agendadas ◄───────┤
   │                               │                        ───────►│ Lista aguardando
   │                               │                               │
   │                               │   POST /fila/agendadas/:id/aceitar ◄──
   │                               │   Atualiza status → 'aceito'
   │                               │   Define farmaceuticoId
   │                               │
   │  (recebe notificação)         │                               │
   │                               │                               │
   │  (preenche triagem)           │                               │
   ├─ PATCH /consulta/:id/...      │                               │
   │  (salvarRascunho, etc.)       │                               │
   │                               │                               │
   │                               │   PATCH /consulta/:id/concluir ◄──
   │                               │   Salva observações, receita,
   │                               │   retorno sugerido
   │                               │   Credita farmacêutico
   │                               │
   │  GET /paciente/documentos ───►│                               │
   │                            ◄──┤ UNION ALL de consultas concluídas
```

---

### 5.3 Consulta urgente

```
Paciente                        Backend                         Farmacêutico
   │                               │                               │
   ├─ POST /fila/urgente           │                               │
   │  { tipo, dependentId? }    ──►│ Cria FilaUrgente              │
   │                               │ status: 'aguardando'          │
   │                            ◄──┤ { id }                        │
   │                               │                               │
   │  GET /fila/urgente/ativa   ──►│ Retorna urgente ativa         │
   │  (polling a cada 5s)       ◄──┤ (status + farmacêutico)       │
   │                               │                               │
   │                               │   GET /fila/urgentes ◄────────┤
   │                               │   (farmacêuticos online veem) │
   │                               │                               │
   │                               │   POST /fila/urgente/:id/aceitar ◄──
   │                               │   Atualiza status → 'em_andamento'
   │                               │   Define aceitoEm
   │                               │
   │  (polling detecta aceitação)  │                               │
   │  → navega para triagem        │                               │
```

---

### 5.4 Ciclo de vida de uma consulta (fila)

```
aguardando
    │
    ├─ [farmacêutico aceita]     → em_andamento
    │       │
    │       ├─ [farmacêutico conclui]  → concluido
    │       ├─ [farmacêutico devolve]  → devolvido  (volta para fila)
    │       ├─ [farmacêutico cancela]  → cancelado  (crédito devolvido)
    │       └─ [sem contato marcado]   → sem_contato
    │
    └─ [paciente cancela]        → cancelado  (crédito devolvido)
```

---

### 5.5 Emissão e distribuição de receita

```
[ConsultaModal — farmacêutico]
    │
    ├─ Preenche itens da receita (JSON)
    ├─ POST /consulta/:id/receita/pdf
    │       └─ PDFKit gera PDF em memória
    │       └─ Salva em UPLOAD_DIR
    │       └─ Armazena caminho em receita_pdf_url (raw)
    │
[ReceitaViewer — paciente]
    │
    ├─ GET /paciente/consulta/:id/pdf
    │       └─ Verifica ownership (pacienteId ou dependentId)
    │       └─ Lê arquivo do disco
    │       └─ res.sendFile(caminho) com Content-Type: application/pdf
    │
    ├─ [Download] → abre PDF no browser
    └─ [Compartilhar]
            └─ fetch blob do PDF
            └─ new File([blob], 'receita.pdf')
            └─ navigator.share({ files: [file] })
               → sistema operacional cuida da distribuição
               → zero URL pública exposta
```

---

### 5.6 Pagamentos e carteira

O sistema usa uma **carteira virtual** simulada (sem gateway real em produção):

```
[CheckoutPix — paciente]
    │
    ├─ POST /pagamentos/pix      → cria Pagamento com status 'Pendente'
    │                              gera QR code mock
    │
    └─ POST /pagamentos/confirmar → status → 'Confirmado'
                                    Credita Carteira
                                    Cria TransacaoCarteira (tipo: 'credito')

[FilaController — ao entrar na fila]
    │
    └─ Verifica saldo suficiente
       Debita Carteira
       Cria TransacaoCarteira (tipo: 'debito')
       Define creditoDebitado na FilaAgendada/FilaUrgente

[ConsultaController — ao cancelar/devolver]
    │
    └─ Credita de volta o valor de creditoDebitado
       Cria TransacaoCarteira (tipo: 'estorno')
```

---

## 6. Modelo de segurança

### 6.1 Isolamento de dados entre usuários

**Paciente → Paciente**

Todas as queries de paciente incluem `pacienteId: req.user.id` na cláusula WHERE. Para dependentes:

```js
// Aceita se é o titular OU se o dependente pertence ao titular
const dep = await prisma.dependentProfile.findFirst({
  where: { id: dependentId, ownerId: req.user.id }
});
if (!dep) return res.status(403).json({ error: 'Acesso negado.' });
```

**Farmacêutico → Farmacêutico**

Endpoints que retornam dados completos de consulta verificam `farmaceuticoId`:

```js
if (consulta.farmaceuticoId && consulta.farmaceuticoId !== req.user.id) {
  return res.status(403).json({ error: 'Acesso negado.' });
}
```

Isso impede que um farmacêutico acesse a triagem (dados de saúde) ou receita de consultas de outro farmacêutico via manipulação de ID na URL.

**Download de PDF**

`getReceitaPdfPaciente` verifica que `pacienteId === req.user.id` OU que o `dependentId` da consulta pertence ao titular antes de `res.sendFile`.

---

### 6.2 Rate limiting

| Grupo | Limite | Janela |
|-------|--------|--------|
| `/api/auth/*` | 20 req/IP | 15 min |
| Demais | Sem limite (implícito) | — |

---

### 6.3 LGPD

**Art. 7º — Base legal:** Consentimento registrado em `ConsentRecord` com timestamp e IP.

**Art. 18 — Direitos do titular:**

| Direito | Implementação |
|---------|--------------|
| Acesso | `GET /lgpd/exportar` — JSON com todos os dados do usuário |
| Portabilidade | Mesmo endpoint, formato JSON estruturado |
| Eliminação | `POST /lgpd/excluir-conta` — soft-delete com pseudonimização |

A exclusão de conta:
1. Invalida o token do usuário (remoção do JWT via expiração curta não é possível sem blacklist — a implementação atual faz logout imediato no frontend)
2. Pseudonimiza nome e e-mail
3. Remove dados sensíveis (`cpf`, `telefone`, dados de saúde)
4. Preserva registros financeiros para obrigações legais (art. 16 LGPD)

---

## 7. Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL |
| `JWT_SECRET` | Sim | Segredo mínimo 32 chars |
| `PORT` | Não (3000) | Porta do servidor |
| `FRONTEND_URL` | Não | Origens CORS permitidas (separadas por vírgula) |
| `GOOGLE_CLIENT_ID` | Para OAuth | ID do app no Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Para OAuth | Segredo do app |
| `SMTP_HOST` | Para e-mail | Host SMTP |
| `SMTP_PORT` | Para e-mail | Porta (padrão 587) |
| `SMTP_USER` | Para e-mail | Usuário SMTP |
| `SMTP_PASS` | Para e-mail | Senha SMTP |
| `ADMIN_NOTIFICATION_EMAIL` | Para e-mail | Destinatário de alertas |
| `UPLOAD_DIR` | Não (`./uploads`) | Diretório de arquivos enviados |

### Frontend (`frontend/.env`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_API_URL` | Não (`http://localhost:3000`) | URL base da API |
| `VITE_GOOGLE_CLIENT_ID` | Para OAuth | Mesmo `GOOGLE_CLIENT_ID` do backend |

---

## 8. Scripts de manutenção

Localizados em `backend/scripts/`. Todos são módulos ESM executados com `node scripts/<nome>.mjs`.

| Script | Finalidade |
|--------|-----------|
| `migrate-consulta-campos.mjs` | Adiciona colunas raw em FilaAgendada e FilaUrgente |
| `migrate-receita-campos.mjs` | Adiciona `receita` e `receita_pdf_url` |
| `migrate-devolucao-campos.mjs` | Adiciona campos de devolução e remarcação |
| `migrate-log-acoes.mjs` | Cria tabela de log de ações administrativas |
| `migrate-user-profile.mjs` | Migração inicial de perfis de usuário |

---

*Documentação gerada em 2026-07-03. Versão do código: `v0.1-testado-2x2`.*
