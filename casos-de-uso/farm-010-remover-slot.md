---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico remove slot livre

## Contexto
Farmacêutico quer cancelar um horário específico que estava livre (ex.: imprevistos, folga pontual) sem reconfigurar toda a agenda.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- `Availability` com `id = :id` existe, pertence ao farmacêutico autenticado, e `isBooked: false`.

## Fluxo principal
1. Farmacêutico envia `DELETE /api/pharmacists/availability/:id` com token JWT.
2. Sistema busca o slot pelo `id`.
3. Verifica se `slot.pharmacistId === userId do token`.
4. Verifica se `isBooked: false`.
5. Deleta o registro.
6. Retorna HTTP 200 `{ message: "Horário removido com sucesso." }`.

## Fluxos de exceção
- **Slot não encontrado**: HTTP 404 `{ error: "Horário não encontrado." }`.
- **Slot pertence a outro farmacêutico**: HTTP 403 `{ error: "Você não pode excluir horários de outro farmacêutico." }`.
- **Slot já reservado (`isBooked: true`)**: HTTP 400 `{ error: "Não é possível excluir um horário já reservado." }`.
- **Token inválido**: HTTP 401.

## Resultado esperado
O `Availability` é removido do banco. O slot não aparece mais na listagem pública nem na agenda do farmacêutico.

## Cenários de teste
- [ ] Dado slot livre do farmacêutico autenticado, quando DELETE /availability/:id, então HTTP 200 e slot removido
- [ ] Dado slot reservado (`isBooked: true`), quando DELETE /availability/:id, então HTTP 400
- [ ] Dado `:id` pertencente a outro farmacêutico, quando DELETE, então HTTP 403
- [ ] Dado `:id` inexistente, quando DELETE, então HTTP 404
- [ ] Dado farmacêutico A tentando deletar slot do farmacêutico B, quando DELETE, então HTTP 403 (mesmo que B também seja farmacêutico aprovado)

## Ambiguidades
- Nenhuma. Fluxo bem definido com todas as exceções documentadas.
