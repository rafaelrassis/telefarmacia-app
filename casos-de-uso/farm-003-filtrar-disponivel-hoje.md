---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Listar farmacêuticos com disponibilidade hoje

## Contexto
Paciente quer uma consulta no dia atual e precisa ver apenas quem tem horário livre hoje.

## Pré-condições
- Farmacêutico aprovado com pelo menos um slot `isBooked: false` com `dateTime` entre `00:00` e `23:59` do dia atual.

## Fluxo principal
1. Cliente envia `GET /api/pharmacists?today=true`.
2. Sistema calcula `start = hoje 00:00:00` e `end = amanhã 00:00:00`.
3. Filtra farmacêuticos que possuem pelo menos um `Availability` livre nesse intervalo.
4. Para cada farmacêutico retornado, inclui o **próximo slot disponível do dia** (`availabilities[0]`).
5. Retorna HTTP 200 com array.

## Fluxos alternativos
- **Nenhum farmacêutico tem slot hoje**: retorna `[]` com HTTP 200.

## Fluxos de exceção
- Nenhum documentado além do erro genérico de banco (HTTP 500).

## Resultado esperado
Array contendo apenas farmacêuticos com slot livre hoje. Cada objeto inclui `availabilities` com exatamente um elemento: o próximo horário disponível no dia.

## Cenários de teste
- [ ] Dado farmacêutico com slot às 14:00 hoje (livre), quando `?today=true`, então aparece na lista com `availabilities[0].dateTime` igual a 14:00
- [ ] Dado farmacêutico com slot às 14:00 hoje (reservado), quando `?today=true`, então **não** aparece
- [ ] Dado farmacêutico com slot amanhã (livre), quando `?today=true`, então **não** aparece
- [ ] Dado farmacêutico com 3 slots livres hoje, quando `?today=true`, então `availabilities` tem exatamente 1 elemento (o mais cedo)

## Ambiguidades
- A spec não define o que acontece se o único slot disponível hoje já passou (mas ainda está `isBooked: false`). O filtro `dateTime >= start` incluiria slots do passado no mesmo dia.
