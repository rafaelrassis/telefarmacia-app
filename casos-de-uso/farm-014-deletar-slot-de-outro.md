---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico tenta remover slot de outro farmacêutico

## Contexto
Farmacêutico mal-intencionado ou com erro tenta excluir um horário que pertence a outro profissional.

## Pré-condições
- Dois farmacêuticos autenticados existem: A (autor da requisição) e B (dono do slot).
- `Availability` com `id = :id` pertence a B.

## Fluxo principal (de exceção)
1. Farmacêutico A envia `DELETE /api/pharmacists/availability/:id` (slot de B) com seu token.
2. Sistema encontra o slot.
3. Verifica que `slot.pharmacistId ≠ userId do token`.
4. Retorna HTTP 403 `{ error: "Você não pode excluir horários de outro farmacêutico." }`.
5. Slot permanece no banco.

## Resultado esperado
Slot de B não é deletado. HTTP 403 retornado para A.

## Cenários de teste
- [ ] Dado slot do farmacêutico B (livre), quando farmacêutico A envia DELETE com id do slot de B, então HTTP 403
- [ ] Dado slot do farmacêutico B (reservado), quando farmacêutico A envia DELETE, então HTTP 403 (403 tem prioridade sobre 400)
- [ ] Dado slot do próprio farmacêutico A (livre), quando DELETE, então HTTP 200 (confirma que ownership check funciona corretamente)

## Ambiguidades
- A spec não define a ordem das verificações: o sistema checa ownership antes ou depois de verificar `isBooked`? Se for ownership primeiro (como nos cenários de teste acima), farmacêutico A recebe 403 mesmo para slots reservados de B — o que é o comportamento mais seguro.
