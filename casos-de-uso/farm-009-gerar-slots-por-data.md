---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico gera slots para data específica (legado)

## Contexto
Endpoint legado que permite ao farmacêutico criar slots manualmente para uma data pontual, sem reconfigurar toda a agenda semanal.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- `pharmacistProfile.isApproved: true`.
- Body com `{ date, startHour, endHour }`.

## Fluxo principal
1. Farmacêutico envia `POST /api/pharmacists/availability` com `{ date, startHour, endHour, durationMinutes? }`.
2. Sistema valida campos obrigatórios.
3. Verifica `isApproved: true`.
4. Calcula `startTime = date + startHour:00:00`, `endTime = date + endHour:00:00`.
5. Valida que `startTime < endTime`.
6. Gera slots com intervalo `durationMinutes + 15` minutos (default: 30 + 15 = 45 min).
7. **Acumula** slots — não deleta os existentes.
8. Persiste via `createMany`.
9. Retorna HTTP 201 com `{ message, slotsCreated: N }`.

## Fluxos alternativos
- **`durationMinutes` não informado**: usa 30 como padrão (intervalo total = 45 min).
- **Nenhum slot gerado** (ex: `startHour == endHour`): retorna HTTP 400 `{ error: "Nenhum horário gerado com este intervalo." }`.

## Fluxos de exceção
- **`date`, `startHour` ou `endHour` ausentes**: HTTP 400 `{ error: "Data, hora de início e hora de fim são obrigatórios." }`.
- **`startTime >= endTime`**: HTTP 400 `{ error: "Intervalo de horário inválido." }`.
- **Não aprovado**: HTTP 403.

## Resultado esperado
Novos slots adicionados ao `Availability` do farmacêutico para a data informada. Slots anteriores na mesma data **não são removidos** (diferença crítica em relação ao PUT weekly-schedule).

## Cenários de teste
- [ ] Dado `{ date: "2026-07-01", startHour: 8, endHour: 10 }`, quando POST /availability, então cria 2 slots: 08:00 e 08:45
- [ ] Dado slots pré-existentes às 08:00, quando POST /availability com mesma data e hora, então cria slots adicionais (duplicata possível)
- [ ] Dado `{ startHour: 10, endHour: 8 }`, quando POST /availability, então HTTP 400 "Intervalo inválido"
- [ ] Dado `{ date: "2026-07-01" }` sem startHour, quando POST /availability, então HTTP 400 "campos obrigatórios"
- [ ] Dado `durationMinutes: 60`, quando POST /availability de 08:00 a 10:00, então 1 slot criado (08:00; próximo seria 09:15, mas ultrapassa 10:00)

## Ambiguidades
- A spec não define se `startHour` e `endHour` são inteiros ou podem ser decimais (ex: `8.5` = 08:30). A implementação usa `String(startHour).padStart(2, '0')`, o que aceita qualquer número mas pode gerar datas inválidas com decimais.
- Não há proteção contra slots duplicados — chamar duas vezes com os mesmos parâmetros cria slots em duplicata.
