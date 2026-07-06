# Spec — Farmacêutico: Perfil, Agenda Semanal e Disponibilidade

## O que faz

Gerencia o ciclo completo do farmacêutico: perfil público, agenda semanal recorrente, geração automática de slots de disponibilidade e flag de status online.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/pharmacists` | Pública | Lista farmacêuticos aprovados |
| `GET` | `/api/pharmacists/:id/availability` | Pública | Slots disponíveis de um farmacêutico |
| `GET` | `/api/pharmacists/me/schedule` | JWT FARM. | Todos os slots futuros do próprio farmacêutico |
| `GET` | `/api/pharmacists/me/weekly-schedule` | JWT FARM. | Agenda semanal recorrente salva |
| `PUT` | `/api/pharmacists/weekly-schedule` | JWT FARM. | Salva agenda semanal e regenera slots |
| `POST` | `/api/pharmacists/availability` | JWT FARM. | Gera slots para uma data específica (legado) |
| `DELETE` | `/api/pharmacists/availability/:id` | JWT FARM. | Remove um slot livre |
| `PATCH` | `/api/pharmacists/profile` | JWT FARM. | Atualiza bio, tags e chave PIX |

---

## Regras de negócio

### Listagem pública (`GET /api/pharmacists`)

- Filtra apenas `role: FARMACEUTICO` com `pharmacistProfile.isApproved: true`.
- Query params suportados:
  - `?tag=<string>` — filtra farmacêuticos com a tag exata no array `tags[]`.
  - `?today=true` — retorna apenas quem tem slot livre hoje (inclui o próximo slot disponível no dia).
  - `?online=true` — retorna apenas quem tem `isOnline: true`.
- Resposta inclui: `pharmacistProfile`, `weeklySchedule` (dias ativos), `_count` de consultas CONCLUIDAS.

### Status Online (`isOnline`)

- Campo `Boolean` em `PharmacistProfile`, default `false`.
- Controlado exclusivamente pelo farmacêutico via `PUT /api/pharmacists/weekly-schedule`.
- Farmacêutico offline não aparece no filtro `?online=true`, mas aparece na listagem padrão.

### Agenda Semanal Recorrente (`PUT /api/pharmacists/weekly-schedule`)

**Só funciona para farmacêuticos com `isApproved: true`.**

Recebe `{ schedule: [...], isOnline: boolean }` onde cada item de `schedule` é:
```json
{ "dayOfWeek": 1, "startTime": "08:00", "endTime": "17:00", "isActive": true }
```
- `dayOfWeek`: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado.
- `startTime` / `endTime`: strings `"HH:mm"` com horas inteiras.

**Processamento:**
1. Faz upsert de cada dia na tabela `WeeklySchedule` (constraint única: `pharmacistId + dayOfWeek`).
2. Atualiza `isOnline` no `PharmacistProfile`.
3. **Deleta todos os slots futuros não reservados** (`isBooked: false`, `dateTime >= now`).
4. Regenera slots para os **próximos 28 dias** com base nos dias ativos.

**Geração de slots:**
- Intervalo: **45 minutos** por slot (30 min de consulta + 15 min de buffer).
- Para o dia atual: pula slots que já passaram + 1 hora de buffer.
- Slots com `startTime >= endTime` são ignorados.

Exemplo: `08:00–17:00` → 12 slots: 08:00, 08:45, 09:30, 10:15, 11:00, 11:45, 12:30, 13:15, 14:00, 14:45, 15:30, 16:15.

### Geração de slots por data específica (`POST /api/pharmacists/availability`) — legado

- Recebe `{ date, startHour, endHour, durationMinutes? }`.
- `durationMinutes` default: 30. Intervalo real: `durationMinutes + 15`.
- Não deleta slots existentes — acumula.
- Requer `isApproved: true`.

### Remoção de slot (`DELETE /api/pharmacists/availability/:id`)

- Só o próprio farmacêutico pode deletar seus slots.
- Não permite deletar slots `isBooked: true` (paciente já reservou).

---

## Schema relevante

```prisma
model PharmacistProfile {
  isApproved Boolean @default(false)
  isOnline   Boolean @default(false)
  tags       String[]
  bio        String
  crfNumber  String
  crfUF      String
}

model WeeklySchedule {
  pharmacistId String
  dayOfWeek    Int      // 0–6
  startTime    String   // "HH:mm"
  endTime      String   // "HH:mm"
  isActive     Boolean
  @@unique([pharmacistId, dayOfWeek])
}

model Availability {
  pharmacistId String
  dateTime     DateTime
  isBooked     Boolean @default(false)
}
```

---

## Entradas / Saídas

### `PUT /api/pharmacists/weekly-schedule`
```
Body:  { schedule: [{ dayOfWeek, startTime, endTime, isActive }], isOnline: boolean }
200:   { message, slotsGenerated: number }
400:   { error: "Agenda inválida." }
403:   { error: "Conta não aprovada pelo administrador." }
```

### `GET /api/pharmacists/me/weekly-schedule`
```
200: { schedule: WeeklySchedule[], isOnline: boolean }
```

---

## Dependências

- `PharmacistProfile.isApproved` deve ser `true` para gerar disponibilidade.
- Ordem das rotas no Express: paths fixos (`/me/schedule`, `/me/weekly-schedule`) **antes** do path dinâmico (`/:id/availability`) para evitar conflito de rota.

---

## Limitações conhecidas

- Ao salvar a agenda semanal, **todos os slots futuros livres são deletados e recriados** — farmacêuticos com consultas já agendadas perdem os outros slots livres se reagendarem a qualquer hora.
- Não há timezone configurável por farmacêutico — geração de slots usa `new Date()` local do servidor.
- Agenda gera exatamente 28 dias à frente, sem opção de configurar o horizonte.
- Não existe slot de 30/60 min variável na agenda semanal (fixo 45 min); o endpoint legado permite `durationMinutes`.
