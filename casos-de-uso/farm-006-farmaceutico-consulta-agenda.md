---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico consulta própria agenda futura

## Contexto
Farmacêutico acessa o painel e quer ver todos os seus slots futuros (livres e reservados).

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- Token JWT válido no header `Authorization`.

## Fluxo principal
1. Farmacêutico envia `GET /api/pharmacists/me/schedule` com token JWT.
2. Sistema extrai `pharmacistId` do token.
3. Busca `Availability` onde `pharmacistId = id do token` e `dateTime >= now()`.
4. Retorna array ordenado por `dateTime asc`.
5. Retorna HTTP 200.

## Fluxos alternativos
- **Nenhum slot futuro cadastrado**: retorna `[]` com HTTP 200.

## Fluxos de exceção
- **Token ausente ou inválido**: middleware retorna HTTP 401.
- **Role ≠ FARMACEUTICO**: ⚠️ ambiguidade — a spec exige `JWT FARM.` mas não define se o middleware valida o role ou apenas autentica.

## Resultado esperado
Array de todos os `Availability` futuros do próprio farmacêutico, incluindo `isBooked: true` (diferente da rota pública que filtra apenas livres).

## Cenários de teste
- [ ] Dado farmacêutico com 5 slots futuros (3 livres, 2 reservados), quando GET /me/schedule, então retorna os 5
- [ ] Dado que todos os slots do farmacêutico são no passado, quando GET /me/schedule, então retorna `[]`
- [ ] Dado paciente autenticado tentando acessar, quando GET /me/schedule, então: ⚠️ comportamento não definido na spec

## Ambiguidades
- A spec não deixa explícito se pacientes autenticados recebem 403 ou se o endpoint filtra silenciosamente por `pharmacistId` (retornando `[]`).
- Não está claro se retorna ambos `isBooked: true` e `isBooked: false` — a rota pública filtra só os livres; esta provavelmente retorna todos, mas a spec não confirma.
