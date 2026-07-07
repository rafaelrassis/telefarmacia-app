# Spec — Evolução do Dashboard do Farmacêutico

## O que faz

Complementa `spec-farmaceutico.md` (perfil/agenda/disponibilidade) com notificações em tempo real, continuidade de cuidado, transparência financeira por consulta e produtividade no dia a dia do farmacêutico.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/push/vapid-public-key` | Pública | Chave pública VAPID para registrar subscription de push |
| `POST` | `/api/push/subscribe` | JWT | Registra/atualiza uma subscription de Web Push do usuário |
| `DELETE` | `/api/push/subscribe` | JWT | Remove uma subscription (por `endpoint`) |
| `GET` | `/api/consulta/:id/historico-completo?tipo=` | JWT FARM. | Até 10 consultas concluídas anteriores da mesma pessoa (titular OU dependente, nunca misturados) |
| `GET` | `/api/farmaceutico/me/avaliacoes?page=&limit=` | JWT FARM. | Média, total, distribuição por nota e lista paginada de avaliações recebidas |
| `GET` | `/api/farmaceutico/ganhos?de=&ate=&page=` | JWT FARM. | Totais do período + lista paginada por consulta (bruto, comissão %, líquido) |
| `GET` | `/api/farmaceutico/ganhos/export?de=&ate=` | JWT FARM. | CSV (BOM, `;`, decimal com vírgula) do detalhamento de ganhos do período |
| `GET` | `/api/farmaceutico/me/repasses?page=` | JWT FARM. | Histórico de repasses recebidos + resumo (líquido acumulado, total repassado, saldo pendente) |

---

## Regras de negócio

### Notificações in-app (sino)

O componente de notificações (antes só visível para `activeEnv === 'patient'`) agora também aparece para `activeEnv === 'pharmacist'` — o endpoint `GET/PATCH /api/paciente/notificacoes*` já operava genericamente por `req.user.id`, sem checagem de role. Farmacêutico passa a receber notificação (`criarNotificacao`) em:
- Conta aprovada (`tipo: 'conta_aprovada'`).
- Paciente aceitou/propôs outro horário na remarcação (`tipo: 'remarcacao_respondida'`) ou recusou (`tipo: 'remarcacao_recusada'`, com estorno).
- Paciente cancelou consulta que ele já havia aceitado (`tipo: 'consulta_cancelada_paciente'`).
- Nova avaliação recebida (`tipo: 'avaliacao'`) — **nunca** expõe a nota no título/corpo, só "Você recebeu uma nova avaliação".

> Nota: corrigido um bug pré-existente em `responderRemarcacao` — a query raw retornava colunas em camelCase (`pacienteId`, `creditoDebitado`), mas o código comparava contra as chaves em minúsculas, fazendo a rota sempre retornar 404. Corrigido para acessar as chaves com o case correto.

### Web Push para urgentes novas

- Modelo `PushSubscription` (`userId`, `endpoint` único, `keys` JSON `{p256dh, auth}`).
- Push disparado apenas ao criar uma `FilaUrgente`, para farmacêuticos **aprovados + `disponivelUrgencias: true` + não suspensos** com subscription ativa — fire-and-forget, nunca falha a criação da urgência (try/catch isolado em `pushService.js`).
- Resposta 404/410 do serviço de push remove a subscription automaticamente.
- Service Worker customizado (`frontend/src/sw.js`, estratégia `injectManifest` do `vite-plugin-pwa`) escuta `push` (exibe notificação) e `notificationclick` (foca/abre o dashboard).
- Frontend registra a subscription automaticamente quando o farmacêutico liga "Disponível para urgências" com permissão de notificação concedida; toggle dedicado "Notificações push" no dashboard permite ativar/revogar manualmente.
- **Default**: push cobre só urgentes novas — agendadas aguardando continuam sem push.

### Histórico do paciente (continuidade de cuidado)

Endpoint já existente (`getHistoricoCompleto`) satisfazia o requisito integralmente: guarda apenas o farmacêutico dono da consulta ativa (`aceito`/`em_atendimento`), isola o histórico do dependente do titular (`dependentId` no filtro), grava acesso via `logAction` (`acao: 'acesso_historico'`) e retorna motivo/observações/receita/farmacêutico anterior. Limite ajustado de 30 para 10 registros para alinhar ao critério de aceite. UI: seção colapsável em `ConsultaModal`, fechada por padrão, com modal de detalhe por atendimento anterior.

### Aba "Avaliações" do farmacêutico

`GET /api/farmaceutico/me/avaliacoes` substitui a antiga rota pública `GET /api/farmaceuticos/:id/avaliacoes` (removida — sem consumidor). Retorna `{ media, total, distribuicao, data, page, totalPages }`; `distribuicao` e `media` sempre refletem o total (não só a página atual).

### Comissão gravada por consulta

- Coluna raw `comissao_percentual NUMERIC(5,2)` em `FilaAgendada` e `FilaUrgente` (migração `migrate-comissao-percentual.mjs`).
- Gravada em `concluirConsulta` com a comissão vigente no momento (individual do farmacêutico ou padrão).
- Consultas concluídas antes da coluna existir não têm valor gravado: ao exibir, cai para a comissão atual e é marcada `estimado: true` (nunca é ambíguo silenciosamente).
- `GET /api/farmaceutico/ganhos` e seu export usam a comissão gravada por item quando disponível.

### Repasses visíveis ao farmacêutico

`saldo_pendente = liquido_acumulado - total_repassado`, onde `liquido_acumulado` soma todas as consultas concluídas usando a comissão gravada por consulta (fallback para a atual quando ausente) — mais preciso que a métrica pré-existente "A receber" da aba Ganhos, que usa uma única taxa uniforme para todo o histórico.

### Resumo do dia

Card fixo no topo do dashboard (`ResumoDoDia`): conta consultas **agendadas** aceitas para o dia corrente (fuso America/Sao_Paulo) + horário da próxima (com "em X min" quando for dentro de 1h), e total de urgentes aguardando na fila (destaque vermelho quando > 0). Reaproveita os endpoints já existentes `GET /api/farmaceutico/calendario` e `GET /api/fila/urgentes?status=aguardando`; atualiza sozinho a cada 60s.

### Templates com variáveis

Sintaxe de chave dupla `{{paciente_nome}}`, `{{data}}`, `{{farmaceutico_nome}}` — processada **antes** da sintaxe legada de chave simples (`{paciente}`, `{data}`, `{idade}`, já suportada) para não deixar chaves residuais quando o mesmo nome de variável existir nos dois formatos (ex.: `{{data}}` vs `{data}`). Templates sem nenhuma variável continuam funcionando (substituição é no-op). Hint atualizado no `TemplateFormModal` e no rodapé do `TemplatePicker`.

---

## Schema

```prisma
model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation("UserPushSubs", fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  keys      Json
  createdAt DateTime @default(now())
  @@index([userId])
}
```

Coluna raw adicional (fora do schema Prisma, via script `ALTER TABLE ... IF NOT EXISTS`, padrão do repositório): `comissao_percentual NUMERIC(5,2)` em `FilaAgendada` e `FilaUrgente`.

---

## Variáveis de ambiente

| Var | Descrição |
|---|---|
| `VAPID_PUBLIC_KEY` | Chave pública VAPID (Web Push) |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID |
| `VAPID_SUBJECT` | `mailto:` ou URL de contato exigido pelo protocolo VAPID |

Gerar com `npx web-push generate-vapid-keys`. Sem essas variáveis, `pushService` simplesmente não envia push (nenhuma falha visível ao usuário).

---

## Limitações conhecidas

- `aReceber` da aba Ganhos (métrica pré-existente) ainda usa uma taxa de comissão uniforme para todo o histórico pendente, diferente do cálculo mais preciso (por consulta) usado na nova seção "Repasses" — podem divergir ligeiramente quando a comissão mudou ao longo do tempo.
- Push não cobre consultas agendadas aguardando aceite — só urgentes novas (default deliberado da spec).
