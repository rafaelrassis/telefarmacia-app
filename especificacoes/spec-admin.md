# Spec — Painel Administrativo

## O que faz

Fornece ao(s) administrador(es) visibilidade e controle sobre farmacêuticos, pacientes, consultas (fila agendada/urgente) e a saúde operacional da plataforma. A identidade de admin é baseada em email, com duas fontes possíveis: a variável de ambiente `ADMIN_EMAILS` e uma lista editável pela própria UI, persistida em `SystemConfig` (chave `admin_emails`).

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/admin/metricas` | JWT + Admin | Métricas gerais (consultas realizadas/agendadas/canceladas, usuários ativos, pendentes) |
| `GET` | `/api/admin/pharmacists` | JWT + Admin | Lista farmacêuticos (paginado: `{data,total,page,totalPages}`), inclui `ocorrencias30d` |
| `GET` | `/api/admin/patients` | JWT + Admin | Lista pacientes (paginado), inclui `saldo` da carteira |
| `GET` | `/api/admin/farmaceuticos/pendentes` | JWT + Admin | Lista farmacêuticos aguardando aprovação |
| `GET` | `/api/admin/farmaceuticos/:id/documentos` | JWT + Admin | URLs dos documentos enviados (RG/CNH, CRF) |
| `GET` | `/api/admin/farmaceuticos/:id/ocorrencias` | JWT + Admin | Devoluções/"sem contato" do farmacêutico nos últimos 30 dias (paginado) |
| `PATCH` | `/api/admin/pharmacists/:userId/approve` | JWT + Admin | Aprova farmacêutico (notifica) |
| `PATCH` | `/api/admin/pharmacists/:userId/revoke` | JWT + Admin | Revoga aprovação |
| `PATCH` | `/api/admin/farmaceuticos/:id/ativar` | JWT + Admin | Ativa cadastro pendente (notifica) |
| `PATCH` | `/api/admin/farmaceuticos/:id/status` | JWT + Admin | Altera status arbitrário do farmacêutico |
| `POST` | `/api/admin/farmaceuticos/:id/suspender` | JWT + Admin | Suspende farmacêutico (cancela agendadas futuras) |
| `POST` | `/api/admin/farmaceuticos/:id/reativar` | JWT + Admin | Reativa farmacêutico suspenso |
| `DELETE` | `/api/admin/pharmacists/:userId` | JWT + Admin | Descadastra farmacêutico (converte conta em paciente) |
| `GET` | `/api/admin/consultas` | JWT + Admin | Visão unificada da fila agendada + urgente, com filtros e paginação |
| `GET` | `/api/admin/fila/tempo-real` | JWT + Admin | Dashboard operacional (urgentes aguardando, espera, online, expiradas hoje, etc.) |
| `POST` | `/api/admin/carteira/:pacienteId/ajuste` | JWT + Admin | Ajuste manual de saldo (crédito/débito) com motivo obrigatório |
| `GET` | `/api/admin/admins` | JWT + Admin | Lista administradores (origem: `env` ou `config`) |
| `POST` | `/api/admin/admins` | JWT + Admin | Adiciona administrador (persistido em `SystemConfig`) |
| `DELETE` | `/api/admin/admins/:email` | JWT + Admin | Remove administrador (bloqueado para email de env ou o próprio usuário) |
| `GET` | `/api/admin/logs` | JWT + Admin | Log de ações de consulta (`log_acoes`), paginado, com export CSV (`?export=csv`) |
| `GET` | `/api/admin/audit` | JWT + Admin | Auditoria de ações administrativas (`AdminAuditLog`), paginado |
| `GET` | `/api/admin/config/financeiro` | JWT + Admin | Configuração financeira atual (preço, comissão, tolerâncias, comissões individuais) |
| `PUT` | `/api/admin/config` | JWT + Admin | Salva todas as configs financeiras/operacionais de uma vez |
| `PUT` | `/api/admin/config/preco` | JWT + Admin | Atualiza preço da consulta |
| `PUT` | `/api/admin/config/comissao-padrao` | JWT + Admin | Atualiza comissão padrão |
| `PUT` | `/api/admin/farmaceuticos/:id/comissao` / `/api/admin/comissoes/:id` | JWT + Admin | Define comissão individual |
| `DELETE` | `/api/admin/comissoes/:id` | JWT + Admin | Remove comissão individual |
| `GET` | `/api/admin/financeiro` | JWT + Admin | Visão financeira agregada por período |
| `GET` | `/api/admin/financeiro/export` | JWT + Admin | Exporta CSV (`;`, decimais com vírgula) do detalhamento financeiro do período |
| `GET` | `/api/admin/repasses/preview` | JWT + Admin | Pré-visualiza repasse pendente de um farmacêutico |
| `GET` | `/api/admin/repasses` | JWT + Admin | Histórico de repasses (paginado) |
| `GET` | `/api/admin/repasses/export` | JWT + Admin | Exporta CSV do histórico de repasses |
| `POST` | `/api/admin/repasses` | JWT + Admin | Registra repasse (marca itens como pagos) |
| `GET`/`POST`/`DELETE` | `/api/admin/convites` | JWT + Admin | Convites de cadastro de farmacêutico |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/parceiros` | JWT + Admin | Parceiros da seção "Onde Comprar" |
| `GET`/`PATCH` | `/api/admin/config/onde-comprar` | JWT + Admin | Config da seção "Onde Comprar" |
| `GET`/`PUT` | `/api/admin/horarios` | JWT + Admin | Horários de funcionamento do sistema |
| `GET`/`PATCH` | `/api/admin/sistema` / `/api/sistema/status` | Admin / Público | Abrir/fechar sistema para novos agendamentos |

---

## Regras de negócio

### Proteção de rotas — `adminMiddleware`

```
authMiddleware → adminMiddleware → handler
```

O `adminMiddleware` resolve a lista de admins como a união de:
1. `ADMIN_EMAILS` (env, sempre presente, não removível pela UI);
2. `SystemConfig.admin_emails` (JSON array, editável via `/api/admin/admins`).

O resultado é cacheado em memória por 30s (para evitar hit no banco a cada requisição) e invalidado imediatamente ao adicionar/remover um admin pela UI. Retorna `403` se o email autenticado não estiver na lista resultante.

### Gestão de administradores (`/api/admin/admins`)

- Administradores vindos do env aparecem com `origem: 'env'` e não podem ser removidos pela interface (exige editar `ADMIN_EMAILS` e reiniciar).
- Um admin não pode remover o próprio email, mesmo que ele esteja na lista editável (evita lockout acidental).
- Toda adição/remoção é registrada em `AdminAuditLog`.

### Aprovação de farmacêutico (`.../approve`, `.../ativar`)

- Seta `PharmacistProfile.isApproved = true`.
- Dispara notificação in-app (`tipo: 'conta_aprovada'`) para o farmacêutico.
- Farmacêutico aprovado pode ficar disponível e receber consultas da fila.

### Suspensão (`.../suspender`)

- Marca o farmacêutico como suspenso; ele deixa de receber novas consultas.
- Cancela consultas agendadas futuras associadas a ele (com estorno ao paciente).

### Descadastro (`DELETE .../pharmacists/:userId`)

Transação:
1. Deleta o `PharmacistProfile`.
2. Atualiza `User.role` para `'PACIENTE'` — preserva o histórico de consultas.

### Auditoria de ações administrativas (`AdminAuditLog`)

Toda mutação relevante feita por um admin (aprovar/revogar/suspender farmacêutico, alterar config financeira, registrar repasse, criar/revogar convite, gerir parceiros, ajustar carteira, gerir admins etc.) grava um registro em `AdminAuditLog` via o helper `logAdminAction(prisma, { adminId, acao, alvoTipo, alvoId, detalhes })`. Consultável em `GET /api/admin/audit`, separado do log de ações de consulta (`log_acoes` / `GET /api/admin/logs`).

### Cron de expiração de consultas órfãs

Além dos jobs pré-existentes de urgência (aguardando/aceita), um novo job (a cada 15 min) expira consultas **agendadas** com `status: 'aguardando'` cujo horário + tolerância (`SystemConfig.tolerancia_expiracao_agendada_min`, default 30 min) já passou. A consulta é marcada `status: 'cancelado'` com `motivo_cancelamento` preenchido (não introduz um novo status, para não quebrar filtros existentes), com estorno automático ao paciente e notificação.

### Monitoramento de ocorrências por farmacêutico

`log_acoes` com `acao IN ('devolvido', 'sem_contato')` dos últimos 30 dias é agregado por farmacêutico e exposto como `ocorrencias30d` em `GET /api/admin/pharmacists`. O limite de alerta (visual, badge âmbar) é configurável via `SystemConfig.limite_ocorrencias_30d` (default 5). O detalhamento fica em `GET /api/admin/farmaceuticos/:id/ocorrencias`.

### Ajuste manual de carteira (`POST /api/admin/carteira/:pacienteId/ajuste`)

- `valor` positivo credita, negativo debita; sempre exige `motivo` (mín. 3 caracteres).
- Bloqueia qualquer ajuste que deixaria o saldo negativo.
- Grava `TransacaoCarteira` com `tipo: 'ajuste_admin'`, audita a ação e notifica o paciente.

### Paginação padronizada

Os endpoints de listagem novos e atualizados (`/admin/pharmacists`, `/admin/patients`, `/admin/logs`, `/admin/audit`, `/admin/consultas`) retornam o mesmo formato: `{ data, total, page, totalPages }`. `pharmacists`/`patients` aceitam `page`/`limit` mas usam um limite alto por padrão (500) para não quebrar seletores existentes que dependem da lista completa (filtros de logs, seleção de farmacêutico em repasses).

### Exportação CSV

`/api/admin/logs`, `/api/admin/financeiro/export` e `/api/admin/repasses/export` geram CSV com BOM UTF-8; os dois últimos usam `;` como separador e vírgula como separador decimal (compatibilidade com Excel pt-BR).

---

## Variáveis de ambiente

| Var | Descrição |
|---|---|
| `ADMIN_EMAILS` | Lista de emails de admin separados por vírgula (base fixa, não removível pela UI) |

---

## Limitações conhecidas

- Removida a limitação anterior de "sem log de ações admin" — agora coberta por `AdminAuditLog`.
- Removida a limitação anterior de "sem paginação" nas listagens principais — agora padronizada, exceto onde mantido um limite alto deliberadamente (ver acima).
- A expiração automática de `FilaUrgente` aguardando já existia antes desta spec (job de 5 min baseado em `urgente_max_aguardando_min`) — não foi duplicada por um segundo mecanismo.
