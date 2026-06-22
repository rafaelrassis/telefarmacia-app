# Spec — Pagamento PIX

## O que faz

Gera uma cobrança PIX (atualmente mock) e processa o webhook de confirmação de pagamento, que dispara a criação da sala no Google Meet.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/payments/charge` | JWT | Gera cobrança PIX para um agendamento |
| `POST` | `/api/payments/webhook` | Segredo HMAC | Confirma pagamento recebido |

---

## Regras de negócio

### Geração de cobrança (`POST /api/payments/charge`)

1. Recebe `{ appointmentId }`.
2. Verifica que o agendamento existe e pertence ao paciente autenticado.
3. Gera `pixId = "pix_" + appointmentId` e salva em `Appointment.pixId`.
4. Retorna dados PIX mockados:
   - `pixCopiaECola`: string no formato EMV (início fixo `00020126...`)
   - `qrCodeUrl`: URL da API `api.qrserver.com` com `mockPixData` como dado

**Em produção:** substituir o corpo do mock por chamada ao SDK do gateway escolhido (Asaas, Mercado Pago, Pagar.me). O restante do fluxo (webhook → confirmação → Meet) permanece igual.

### Webhook de confirmação (`POST /api/payments/webhook`)

**Autenticação:** header `x-webhook-secret` deve ser igual à variável `WEBHOOK_SECRET`. Retorna `401` se ausente ou incorreto.

**Processamento:**
1. Lê `{ appointmentId }` do body.
2. Verifica que o agendamento existe e está com status `PENDENTE_PAGAMENTO`.
3. Chama `createMeetEvent()` → obtém `hangoutLink` e `eventId`.
4. Atualiza `Appointment`:
   - `status: 'AGENDADO'`
   - `googleMeetLink: hangoutLink`
   - `googleEventId: eventId`
5. Retorna `{ success: true }`.

Se o agendamento não existir ou já foi processado, retorna `400` sem disparar o Meet.

---

## Entradas / Saídas

### `POST /api/payments/charge`
```
Header: Authorization: Bearer <jwt>
Body:   { appointmentId: string }
200:    { pixCopiaECola: string, qrCodeUrl: string }
403:    { error: "Acesso negado." }            (paciente diferente)
404:    { error: "Agendamento não encontrado." }
```

### `POST /api/payments/webhook`
```
Header: x-webhook-secret: <WEBHOOK_SECRET>
Body:   { appointmentId: string }
200:    { success: true, message: "Pagamento confirmado e Meet gerado." }
400:    { error: "Agendamento inválido ou já processado." }
401:    { error: "Webhook não autorizado." }
500:    { error: "Falha no processamento do pagamento." }  (erro no Google Meet)
```

---

## Variáveis de ambiente

| Var | Valor dev | Descrição |
|---|---|---|
| `WEBHOOK_SECRET` | `dev_webhook_secret_local` | Segredo compartilhado com o gateway |

---

## Como testar o fluxo completo em dev

```bash
# 1. Gere a cobrança (obtém appointmentId do agendamento criado)
curl -X POST http://localhost:3000/api/payments/charge \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "<id>"}'

# 2. Simule o webhook do gateway
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "x-webhook-secret: dev_webhook_secret_local" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "<id>"}'
```

Após o webhook, o agendamento terá `status: AGENDADO` e `googleMeetLink` preenchido (link real ou mock dependendo de `GOOGLE_APPLICATION_CREDENTIALS`).

---

## Dependências

- `googleCalendarService.createMeetEvent` — chamado dentro do webhook
- `WEBHOOK_SECRET` env var — autenticação do webhook
- `Appointment.status` deve ser `PENDENTE_PAGAMENTO` para processar

---

## Limitações conhecidas

- **PIX completamente mockado**: nenhuma integração real com banco ou gateway. A string `pixCopiaECola` é hardcoded com `mockPixData` e não é escaneável por nenhum banco.
- **Sem verificação de valor**: não há preço configurável por farmacêutico nem passado no body. O gateway real precisaria receber o valor da consulta.
- **Sem idempotência no webhook**: se o gateway enviar o webhook duas vezes, a segunda chamada é rejeitada com `400` (agendamento já processado) — comportamento correto, mas pode causar alertas no gateway se ele esperar `200`.
- **Sem retry/fila**: se o Google Meet falhar no webhook, o status não é atualizado e o gateway não é notificado de sucesso. O farmacêutico e o paciente precisam acionar o suporte manualmente.
