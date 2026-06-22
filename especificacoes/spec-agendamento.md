# Spec — Agendamentos (Consultas)

## O que faz

Gerencia o ciclo de vida completo de uma consulta: reserva de slot, confirmação de pagamento, conclusão pelo farmacêutico, cancelamento por qualquer das partes e expiração automática de consultas passadas.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/appointments` | JWT | Reserva slot e cria agendamento |
| `GET` | `/api/appointments` | JWT | Lista agendamentos do usuário atual |
| `GET` | `/api/appointments/:id` | JWT | Busca agendamento por ID |
| `POST` | `/api/appointments/:id/confirm` | JWT | Confirma pagamento e cria sala Meet |
| `PATCH` | `/api/appointments/:id/complete` | JWT FARM. | Encerra consulta com recomendações |
| `PATCH` | `/api/appointments/:id/cancel` | JWT | Cancela consulta |

---

## State Machine de Status

```
                    ┌──────────────────────────────┐
                    │                              ▼
  [slot livre] → PENDENTE_PAGAMENTO → AGENDADO → CONCLUIDO
                         │               │
                         └───────────────┴──→ CANCELADO
```

| Transição | Quem pode | Via |
|---|---|---|
| `→ PENDENTE_PAGAMENTO` | Sistema (criação) | `POST /appointments` |
| `PENDENTE_PAGAMENTO → AGENDADO` | Sistema (webhook ou confirm manual) | webhook ou `POST /confirm` |
| `AGENDADO → CONCLUIDO` | Farmacêutico | `PATCH /complete` |
| `AGENDADO → CONCLUIDO` | Sistema (auto-expire) | `GET /appointments` |
| `PENDENTE_PAGAMENTO → CANCELADO` | Paciente ou Farmacêutico | `PATCH /cancel` |
| `AGENDADO → CANCELADO` | Paciente ou Farmacêutico | `PATCH /cancel` |

---

## Regras de negócio

### Criação — anti-double-booking (`POST /api/appointments`)

Usa `prisma.$transaction` para garantir atomicidade:
1. Busca o slot pelo `availabilityId`.
2. Lança erro `"Horário indisponível."` se o slot não existir ou `isBooked: true`.
3. Atualiza `Availability.isBooked = true`.
4. Cria `Appointment` com `status: PENDENTE_PAGAMENTO`, `durationMinutes: 30`.

Se dois usuários tentarem reservar o mesmo slot simultaneamente, o segundo recebe o erro (transação serializada pelo Postgres).

### Listagem com auto-expire (`GET /api/appointments`)

Antes de retornar os dados, executa:
```sql
UPDATE Appointment
SET status = 'CONCLUIDO'
WHERE status = 'AGENDADO'
  AND dateTime < NOW()
  AND (patientId = $userId OR pharmacistId = $userId)
```
Ou seja: toda consulta AGENDADA cujo horário já passou é automaticamente marcada como CONCLUIDA **na próxima vez que o usuário listar suas consultas**. Não há cron job separado.

### Confirmação de pagamento (`POST /api/appointments/:id/confirm`)

- Só processa se status for `PENDENTE_PAGAMENTO`.
- Chama `createMeetEvent()` → retorna `{ hangoutLink, eventId }`.
- Atualiza status para `AGENDADO` + salva o link do Meet e o ID do evento.
- **Também é chamado pelo webhook** `POST /api/payments/webhook` (mesmo fluxo, iniciado pelo gateway de pagamento).

### Conclusão manual (`PATCH /api/appointments/:id/complete`)

- Apenas o **farmacêutico responsável** pode encerrar.
- Só aceita consultas com status `AGENDADO`.
- Campo `recommendations` (texto livre) é opcional; salvo se fornecido.

### Cancelamento (`PATCH /api/appointments/:id/cancel`)

- **Paciente ou farmacêutico** do agendamento pode cancelar.
- Só cancela `AGENDADO` ou `PENDENTE_PAGAMENTO` — não cancela `CONCLUIDO` ou `CANCELADO`.
- Usa transação:
  1. Atualiza status para `CANCELADO`.
  2. Libera o slot: `Availability.isBooked = false` (match por `pharmacistId + dateTime`).

---

## Entradas / Saídas

### `POST /api/appointments`
```
Body:  { availabilityId: string, pharmacistId: string }
201:   { message, appointment }
400:   { error: "Horário indisponível." }
```

### `GET /api/appointments`
```
200: Appointment[] (inclui patient e pharmacist, ordenado por dateTime desc)
     Efeito colateral: auto-expire de consultas AGENDADO passadas.
```

### `POST /api/appointments/:id/confirm`
```
200: { message, appointment }  (appointment agora com googleMeetLink)
400: { error: "Este agendamento já foi processado." }
404: { error: "Agendamento não encontrado." }
```

### `PATCH /api/appointments/:id/complete`
```
Body:  { recommendations?: string }
200:   { message, appointment }
400:   { error: "Só é possível encerrar consultas com status AGENDADO." }
403:   { error: "Apenas o farmacêutico responsável pode encerrar esta consulta." }
```

### `PATCH /api/appointments/:id/cancel`
```
200: { message: "Consulta cancelada com sucesso." }
400: { error: "Apenas consultas pendentes ou agendadas podem ser canceladas." }
403: { error: "Sem permissão para cancelar este agendamento." }
```

---

## Dependências

- `Availability` — slot deve existir e `isBooked: false` para criar agendamento.
- `googleCalendarService.createMeetEvent` — chamado na confirmação de pagamento.
- Auto-expire é piggyback no `GET /appointments` — não há cron ou job externo.

---

## Limitações conhecidas

- **Auto-expire é lazy**: consultas passadas só expiram quando alguém lista os agendamentos. Se ninguém listar, o status fica `AGENDADO` para sempre no banco.
- **Reembolso não implementado**: cancelamento libera o slot, mas não estorna o pagamento. A spec menciona "entrar em contato com suporte".
- **Sem notificação de cancelamento**: nenhuma notificação por email ou WhatsApp é enviada ao cancelar.
- `getAppointmentById` não verifica se o solicitante é o dono da consulta — qualquer usuário autenticado com o ID pode acessar.
- A liberação do slot no cancelamento usa `updateMany` por `pharmacistId + dateTime`, não por `availabilityId` (que não é salvo no `Appointment`). Funciona se não houver dois slots no mesmo horário para o mesmo farmacêutico, o que não deveria acontecer pela regra de geração.
