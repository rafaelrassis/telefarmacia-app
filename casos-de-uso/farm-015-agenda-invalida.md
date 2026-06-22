---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Agenda semanal inválida ou com horário impossível

## Contexto
Farmacêutico envia um payload malformado ou com configuração de horário sem sentido ao tentar salvar a agenda semanal.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO` e `isApproved: true`.

## Variações do fluxo de exceção

### A — `schedule` ausente ou não-array
1. Body não contém `schedule` ou contém `schedule` que não é array.
2. Retorna HTTP 400 `{ error: "Agenda inválida." }`.
3. Nenhuma alteração no banco.

### B — `schedule` array vazio (`[]`)
1. Body contém `schedule: []`.
2. Retorna HTTP 400 `{ error: "Agenda inválida." }`.

### C — Dia com `startTime >= endTime` (horário impossível)
1. Body contém um dia com `startTime: "17:00"` e `endTime: "08:00"`.
2. Sistema processa o upsert do `WeeklySchedule` normalmente (o dia é salvo).
3. Na geração de slots, o dia é **silenciosamente ignorado** (0 slots gerados para ele).
4. Outros dias válidos geram slots normalmente.
5. Retorna HTTP 200 com `slotsGenerated` refletindo apenas os slots dos dias válidos.

### D — `isOnline` ausente no body
- ⚠️ ambiguidade — ver abaixo.

## Resultado esperado
- Casos A e B: HTTP 400, banco inalterado.
- Caso C: HTTP 200, `WeeklySchedule` salvo (inclusive o dia inválido), mas slots do dia inválido não criados.

## Cenários de teste
- [ ] Dado body `{ isOnline: true }` sem `schedule`, quando PUT weekly-schedule, então HTTP 400
- [ ] Dado `{ schedule: [], isOnline: false }`, quando PUT weekly-schedule, então HTTP 400
- [ ] Dado `{ schedule: [{ dayOfWeek: 1, startTime: "17:00", endTime: "08:00", isActive: true }], isOnline: false }`, quando PUT, então HTTP 200 com `slotsGenerated: 0`
- [ ] Dado agenda com 1 dia válido e 1 inválido (startTime > endTime), quando PUT, então apenas o dia válido gera slots

## Ambiguidades
- A spec não define o comportamento quando `isOnline` está ausente no body. Possivelmente `Boolean(undefined) = false`, silenciosamente marcando o farmacêutico como offline.
- Não está definido se um dia com `startTime === endTime` (ex: `"08:00"` e `"08:00"`) é tratado como inválido ou gera 0 slots — a validação `sH * 60 + sM >= eH * 60 + eM` pegaria esse caso.
