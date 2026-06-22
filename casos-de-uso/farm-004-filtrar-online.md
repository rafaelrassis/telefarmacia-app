---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Listar farmacêuticos online

## Contexto
Paciente quer consultar agora com um farmacêutico que está disponível no momento (marcou-se como online).

## Pré-condições
- Pelo menos um farmacêutico aprovado com `pharmacistProfile.isOnline: true`.

## Fluxo principal
1. Cliente envia `GET /api/pharmacists?online=true`.
2. Sistema aplica filtro `pharmacistProfile.isOnline: true` além dos filtros base.
3. Retorna HTTP 200 com array.

## Fluxos alternativos
- **Nenhum farmacêutico online**: retorna `[]` com HTTP 200.
- **Combinação `?online=true&today=true`**: ambos os filtros aplicados.

## Fluxos de exceção
- Nenhum documentado além do erro genérico de banco.

## Resultado esperado
Array com apenas farmacêuticos aprovados e `isOnline: true`. Farmacêuticos aprovados com `isOnline: false` estão ausentes mesmo que tenham slots disponíveis.

## Cenários de teste
- [ ] Dado farmacêutico A com `isOnline: true` e B com `isOnline: false` (ambos aprovados), quando `?online=true`, então retorna apenas A
- [ ] Dado farmacêutico com `isOnline: true` mas `isApproved: false`, quando `?online=true`, então **não** aparece (filtro de aprovação ainda se aplica)
- [ ] Dado nenhum farmacêutico online, quando `?online=true`, então retorna `[]`

## Ambiguidades
- Não há definição de o que "online" significa semanticamente (disponível para chat imediato? apenas uma flag manual?). A spec diz que é controlado manualmente via PUT weekly-schedule — pode criar confusão com usuários que esperam presença real-time.
