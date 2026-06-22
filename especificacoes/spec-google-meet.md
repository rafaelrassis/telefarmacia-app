# Spec — Integração Google Calendar e Google Meet

## O que faz

Cria eventos no Google Calendar com sala do Google Meet para cada consulta confirmada. Envia convites por email para o paciente e o farmacêutico.

---

## Quando é chamado

- `POST /api/appointments/:id/confirm` — confirmação manual de pagamento
- `POST /api/payments/webhook` — confirmação automática via webhook do gateway

Em ambos os casos, o fluxo é idêntico: chama `createMeetEvent(appointment, pharmacistEmail, patientEmail)`.

---

## Comportamento

### Com `GOOGLE_APPLICATION_CREDENTIALS` configurado

1. Autentica com Service Account usando o arquivo JSON de credenciais.
2. Scope: `https://www.googleapis.com/auth/calendar.events`
3. Cria evento no calendário `GOOGLE_CALENDAR_ID` (ou `'primary'` se não configurado).
4. Parâmetros do evento:
   - **Summary**: `Teleatendimento Farmacêutico - <parte do email do paciente>`
   - **Description**: texto com emails do paciente e farmacêutico
   - **Start/End**: `appointment.dateTime` + `appointment.durationMinutes` minutos
   - **Timezone**: `America/Sao_Paulo`
   - **Attendees**: `[patientEmail, pharmacistEmail]`
   - **conferenceData**: `requestId: "meet-<appointmentId>"` — garante sala única por consulta
   - **sendUpdates: 'all'** — Google envia convite por email para todos os participantes
5. Retorna `{ hangoutLink, eventId }` do response da API.

### Sem `GOOGLE_APPLICATION_CREDENTIALS` (ambiente de dev/mock)

Retorna imediatamente sem chamar a API:
```js
{ hangoutLink: 'https://meet.google.com/mock-link-123', eventId: 'mock-event-id' }
```

Isso permite testar todo o fluxo de agendamento sem credenciais Google configuradas.

---

## Configuração para produção

1. Criar uma **Service Account** no Google Cloud Console com permissão ao Google Calendar API.
2. Baixar o arquivo JSON de credenciais e salvar em `backend/credentials.json`.
3. **Adicionar ao `.gitignore`** — o arquivo contém chave privada.
4. Configurar `GOOGLE_CALENDAR_ID` com o ID do calendário da plataforma (ou deixar em branco para usar o `primary` da Service Account).
5. Compartilhar o calendário com o email da Service Account.

```
# .env
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_CALENDAR_ID=<id>@group.calendar.google.com
```

---

## Variáveis de ambiente

| Var | Obrigatório | Descrição |
|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Não (fallback para mock) | Caminho para o JSON da Service Account |
| `GOOGLE_CALENDAR_ID` | Não (default: `'primary'`) | ID do calendário onde os eventos são criados |

---

## Entradas / Saídas da função

```js
// Entrada
createMeetEvent(
  appointment: { id, dateTime, durationMinutes },
  pharmacistEmail: string,
  patientEmail: string
)

// Saída
{ hangoutLink: string, eventId: string }

// Lança erro se a API do Google falhar (não usa fallback em erro — apenas em ausência de credencial)
throw new Error('Falha ao criar sala no Google Meet.')
```

---

## Limitações conhecidas

- **Service Account não tem acesso ao Meet por padrão**: a sala do Meet só é criada se o domínio do Google Workspace tiver o Meet habilitado para a Service Account, ou se usar um calendário de um usuário que compartilhou acesso.
- **`conferenceDataVersion: 1`** é obrigatório — sem ele, o `conferenceData` é ignorado e nenhuma sala é criada.
- **Não há retry**: se a API do Google falhar durante o webhook, o pagamento é perdido (status fica `PENDENTE_PAGAMENTO`) e precisa de intervenção manual.
- **O `requestId` usa o `appointmentId`**: chamadas duplicadas do webhook para o mesmo appointment tentariam criar um evento com o mesmo `requestId`, o que o Google trata como idempotente (retorna o evento existente). Mas o código já valida o status antes de chamar o Meet, então duplicatas são rejeitadas antes de chegar aqui.
- **`credentials.json` está no repositório** (verificado na Etapa 1 — arquivo existe em `backend/`). Deveria estar no `.gitignore`.
