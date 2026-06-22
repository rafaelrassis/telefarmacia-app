---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico tenta remover slot já reservado

## Contexto
Farmacêutico tenta excluir um horário que um paciente já reservou, o que causaria inconsistência no agendamento ativo.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- `Availability` com `id = :id` existe, pertence ao farmacêutico autenticado, e `isBooked: true`.

## Fluxo principal (de exceção)
1. Farmacêutico envia `DELETE /api/pharmacists/availability/:id`.
2. Sistema encontra o slot e verifica que pertence ao farmacêutico.
3. Verifica `isBooked: true`.
4. Retorna HTTP 400 `{ error: "Não é possível excluir um horário já reservado." }`.
5. Slot permanece no banco.

## Resultado esperado
Slot não é deletado. Agendamento do paciente não é afetado. Retorno HTTP 400.

## Cenários de teste
- [ ] Dado slot com `isBooked: true` do farmacêutico autenticado, quando DELETE /availability/:id, então HTTP 400
- [ ] Dado slot com `isBooked: true`, quando DELETE, então slot ainda existe no banco após a resposta
- [ ] Dado slot com `isBooked: false` (mesmo farmacêutico), quando DELETE, então HTTP 200 (confirma que só o booked bloqueia)

## Ambiguidades
- Nenhuma. Comportamento explícito na spec.
