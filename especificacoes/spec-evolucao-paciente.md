# Spec — Evolução do Paciente

## Objetivo

Cinco melhorias na experiência do paciente: Web Push, posição na fila urgente, remarcação iniciada pelo paciente, recibo em PDF e retorno sugerido acionável. O gateway de pagamento permanece simulado (fora do escopo).

---

## Fase 1 — Web Push para o paciente

A infraestrutura já existe (`pushService`, `PushSubscription` por `userId`, VAPID, service worker). Falta generalizá-la e criar os eventos do paciente.

### Backend

- Refatorar `pushService`: extrair helper `sendPushToUser(userId, payload)` (com a mesma limpeza de subscriptions 410 e try/catch isolado); `notifyFarmaceuticosUrgente` passa a usá-lo.
- Disparar push ao paciente em:
  1. **Consulta aceita** (agendada e urgente): "✅ Um farmacêutico aceitou sua consulta" — no `aceitarAgendada` / `aceitarUrgente`.
  2. **Lembrete 1h antes** da agendada aceita: novo cron a cada 15 min busca `FilaAgendada` com `status: 'aceito'`, `dataHora` entre now+45min e now+75min e `lembrete_enviado = false`; envia "⏰ Sua consulta é às HH:MM" e marca a flag.
  3. **Receita/orientações prontas**: ao `concluirConsulta`, "📄 Suas orientações estão disponíveis".
  4. **Estorno**: em cancelamento pelo farmacêutico, devolução definitiva ou expiração — "💰 Seus créditos foram devolvidos".
- **LGPD**: payloads de push NUNCA contêm conteúdo clínico (motivo, medicamentos, triagem) — apenas texto genérico + `data.url` para o dashboard.

### Schema

Coluna raw `lembrete_enviado BOOLEAN DEFAULT FALSE` em `FilaAgendada` (script `ALTER TABLE … IF NOT EXISTS`, padrão do repo).

### Frontend

- Registrar subscription no `PatientDashboard` — pedir permissão em momento oportuno (após concluir um agendamento ou entrar na fila urgente, nunca no primeiro load).
- Toggle "Notificações push" no perfil do paciente (mesmo padrão do farmacêutico).
- Handler de `notificationclick` já existe no SW — garantir que a URL leva ao dashboard do paciente.

---

## Fase 2 — Posição na fila urgente

### Backend

Estender `GET /api/fila/urgente/ativa` para, quando `status === 'aguardando'`, incluir:

```json
{
  "posicao": 2,
  "total_aguardando": 5,
  "tempo_medio_aceite_min": 6,
  "farmaceuticos_online": 4
}
```

- `posicao` = count de urgentes `aguardando` com `criadoEm` anterior + 1.
- `tempo_medio_aceite_min` = média de `aceitoEm - criadoEm` dos últimos 7 dias (mesma lógica do dashboard operacional do admin — reutilizar/extrair a função).
- `farmaceuticos_online` = ping nos últimos 2 min com `disponivelUrgencias`.

### Frontend

No card de urgente aguardando (que já faz polling): "Você é o **2º** da fila · tempo médio de aceite ~**6 min** · **4** farmacêuticos online". Se `farmaceuticos_online === 0`, mensagem honesta: "Nenhum farmacêutico online agora — você será notificado assim que alguém aceitar."

---

## Fase 3 — Remarcação iniciada pelo paciente

O backend **já existe**: `PATCH /api/consulta/:id/remarcar` (role PACIENTE, `nova_data_hora`, contador `remarcacoes`). O que falta é a UI e um complemento.

### Backend (complemento)

- Verificar as regras atuais do endpoint (status permitidos, limite de remarcações) e documentá-las na resposta de erro.
- Se a consulta já tinha farmacêutico (`status: 'aceito'`): notificar o farmacêutico via `criarNotificacao` + push ("🔄 O paciente remarcou a consulta para <data>"). Confirmar qual é o comportamento atual quanto ao vínculo (mantém o farmacêutico ou volta à fila) e manter esse comportamento — apenas adicionar a notificação.
- Validar `nova_data_hora` contra `/disponibilidade` (horário de funcionamento) se o endpoint ainda não valida.

### Frontend

- Botão "Remarcar" nos cards de agendadas com status `aguardando` ou `aceito` no `MyAppointments`.
- Modal com seletor de novo horário (reutilizar o seletor do fluxo de agendamento, validado contra a disponibilidade do sistema) + confirmação.
- Exibir limite restante se houver (ex.: "1 remarcação restante").

---

## Fase 4 — Recibo em PDF

### Backend

`POST /api/consulta/:id/recibo/pdf?tipo=` — apenas o paciente dono, apenas `status: 'concluido'`:
- Reutilizar o gerador de PDF existente (mesmo padrão da receita/encaminhamento).
- Conteúdo: identificação da plataforma, nome do paciente (e do dependente, se houver), farmacêutico + CRF, data/hora da consulta, tipo (agendada/urgente), valor pago (`creditoDebitado`), id da consulta, data de emissão.
- Sem dados clínicos no recibo (é documento financeiro).

### Frontend

Botão "Recibo" nos cards de consultas concluídas do `MyAppointments`, com download/compartilhamento no mesmo padrão do `ReceitaViewer` (Web Share API com File, sem URL pública).

---

## Fase 5 — Retorno sugerido acionável

O card de retorno já mostra a sugestão (`dias_sugeridos`, observação) com opção de dispensar. Adicionar:

- Botão **"Agendar retorno"** no card → abre o fluxo de agendamento existente com a data pré-selecionada (`hoje + dias_sugeridos`, ajustada para o próximo dia/horário com sistema aberto via `/disponibilidade`).
- Ao concluir o agendamento a partir desse botão: chamar `dispensar-retorno` automaticamente (o card some, sem pedir ação extra).
- Se o paciente alterar a data no fluxo, tudo bem — a pré-seleção é só conveniência.

---

## Resumo de mudanças de schema

| Mudança | Fase |
|---|---|
| Coluna raw `lembrete_enviado` em `FilaAgendada` | 1 |

Sem novas tabelas — `PushSubscription` já é por usuário.

---

## Defaults adotados (revisar antes de executar)

1. Permissão de push pedida após a primeira ação relevante (agendar/urgente), nunca no load.
2. Push sem conteúdo clínico — só mensagens genéricas.
3. Lembrete único de 1h antes (sem lembrete de 24h nesta fase).
4. Remarcação: manter as regras já existentes no backend (limite/status); só adicionar UI, validação de disponibilidade e notificação ao farmacêutico.
5. Recibo sem dados clínicos.

---

## Critérios de aceite

- [ ] Paciente com push habilitado recebe: aceite, lembrete 1h antes (uma única vez), receita pronta e estorno
- [ ] Nenhum payload de push contém dado clínico
- [ ] Card da urgente aguardando mostra posição, tempo médio e farmacêuticos online; mensagem honesta quando 0 online
- [ ] Paciente remarca agendada pela UI; farmacêutico vinculado é notificado (sino + push); regras de limite respeitadas
- [ ] Recibo PDF gerado só para o dono e só para concluídas, com valor e CRF, compartilhável sem URL pública
- [ ] "Agendar retorno" abre o agendamento com data pré-preenchida e dispensa o card ao concluir
- [ ] Roteiro 2×2 sem regressão (agendar, urgente, cancelar com estorno, receita)
- [ ] `TECHNICAL.md` atualizado (novos pushes, coluna raw, endpoint de recibo)
