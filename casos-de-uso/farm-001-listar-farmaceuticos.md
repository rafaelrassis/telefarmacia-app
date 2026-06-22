---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Listar farmacêuticos aprovados (sem filtro)

## Contexto
Qualquer visitante (usuário autenticado ou não) acessa a listagem de farmacêuticos disponíveis na plataforma para escolher com quem consultar.

## Pré-condições
- Pelo menos um `User` com `role: FARMACEUTICO` e `pharmacistProfile.isApproved: true` existe no banco.
- Nenhuma autenticação necessária.

## Fluxo principal
1. Cliente envia `GET /api/pharmacists`.
2. Sistema filtra `User` com `role: FARMACEUTICO` e `pharmacistProfile.isApproved: true`.
3. Para cada farmacêutico retorna: dados do `pharmacistProfile`, `weeklySchedule` (dias ativos), `_count` de consultas concluídas, `avgNota` e `totalAvaliacoes`.
4. Retorna HTTP 200 com array de farmacêuticos.

## Fluxos alternativos
- **Nenhum farmacêutico aprovado**: retorna array vazio `[]` com HTTP 200.

## Fluxos de exceção
- **Erro de banco**: retorna HTTP 500 `{ error: "Erro ao buscar farmacêuticos." }`.

## Resultado esperado
Array de objetos de farmacêutico, cada um contendo perfil público, agenda semanal ativa e contagem de consultas realizadas. Farmacêuticos com `isApproved: false` estão ausentes da lista.

## Cenários de teste
- [ ] Dado que existem 3 farmacêuticos (2 aprovados, 1 não), quando GET /api/pharmacists, então retorna apenas os 2 aprovados
- [ ] Dado que nenhum farmacêutico existe, quando GET /api/pharmacists, então retorna `[]` com 200
- [ ] Dado que um farmacêutico aprovado tem 5 consultas CONCLUIDAS, quando GET /api/pharmacists, então `_count.appointmentsAsPharmacist` retorna 5
- [ ] Dado que um farmacêutico aprovado tem `isOnline: false`, quando GET /api/pharmacists, então ele aparece na lista (sem filtro)

## Ambiguidades
- A spec não define ordem de retorno (por nome? por data de cadastro?). Implementação atual não especifica `orderBy`.
