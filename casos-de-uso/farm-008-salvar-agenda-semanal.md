---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico salva agenda semanal e regenera slots

## Contexto
Farmacêutico define ou atualiza seus dias e horários de atendimento recorrentes. O sistema recria automaticamente todos os slots dos próximos 28 dias.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- `pharmacistProfile.isApproved: true`.

## Fluxo principal
1. Farmacêutico envia `PUT /api/pharmacists/weekly-schedule` com body `{ schedule, isOnline }`.
2. Sistema valida que `schedule` é um array não vazio.
3. Verifica `isApproved: true` — retorna 403 se falso.
4. Faz **upsert** de cada dia em `WeeklySchedule` (chave: `pharmacistId + dayOfWeek`).
5. Atualiza `isOnline` em `PharmacistProfile`.
6. Deleta todos os `Availability` futuros com `isBooked: false` do farmacêutico.
7. Para cada dia ativo nos próximos 28 dias, gera slots de 45 em 45 minutos entre `startTime` e `endTime`.
8. Para o dia atual, pula slots que já passaram + 1 hora de buffer.
9. Persiste os novos slots via `createMany`.
10. Retorna HTTP 200 com `{ message, slotsGenerated: N }`.

## Fluxos alternativos
- **`isOnline: false`**: agenda é salva normalmente, mas farmacêutico some do filtro `?online=true`.
- **Dia com `isActive: false`**: dia é salvo no `WeeklySchedule` mas não gera slots.
- **`startTime >= endTime`**: dia é ignorado na geração (0 slots).
- **Sem nenhum dia ativo**: `slotsGenerated: 0`, mas agenda semanal é salva.
- **Primeira configuração**: não há slots anteriores para deletar; apenas cria.

## Fluxos de exceção
- **`isApproved: false`**: HTTP 403 `{ error: "Conta não aprovada pelo administrador." }`.
- **`schedule` ausente, vazio ou não-array**: HTTP 400 `{ error: "Agenda inválida." }`.
- **Erro de banco**: HTTP 500.

## Resultado esperado
- `WeeklySchedule` do farmacêutico reflete os novos dias/horários.
- `PharmacistProfile.isOnline` atualizado.
- Todos os slots livres anteriores deletados.
- Novos slots criados para os próximos 28 dias conforme `schedule`.
- `slotsGenerated` na resposta reflete o número real de slots criados.

## Cenários de teste
- [ ] Dado agenda `[{ dayOfWeek: 1, startTime: "08:00", endTime: "09:30", isActive: true }]`, quando PUT weekly-schedule, então gera 2 slots: 08:00 e 08:45
- [ ] Dado farmacêutico com 50 slots livres existentes, quando PUT weekly-schedule, então todos os 50 são deletados antes de recriar
- [ ] Dado farmacêutico com slot `isBooked: true`, quando PUT weekly-schedule, então esse slot **não** é deletado
- [ ] Dado `{ dayOfWeek: 3, startTime: "10:00", endTime: "09:00", isActive: true }` (horário inválido), quando PUT, então 0 slots gerados para quarta
- [ ] Dado farmacêutico não aprovado, quando PUT weekly-schedule, então HTTP 403
- [ ] Dado `{ schedule: [] }`, quando PUT weekly-schedule, então HTTP 400
- [ ] Dado `isOnline: true` no body, quando PUT weekly-schedule, então `pharmacistProfile.isOnline` fica `true`

## Ambiguidades
- A spec não define o que acontece com consultas **futuras já agendadas** (`AGENDADO`) nos slots que serão recriados — o slot `isBooked: true` não é deletado, mas a recriação pode gerar um slot duplicado no mesmo horário. ⚠️ Risco de inconsistência.
- Não está especificado se a deleção de slots livres é atômica com a criação (transação). Uma falha na criação poderia deixar o farmacêutico sem slots. ⚠️
