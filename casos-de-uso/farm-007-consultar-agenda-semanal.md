---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico consulta agenda semanal recorrente

## Contexto
Farmacêutico acessa a tela de configuração de agenda e precisa carregar os horários que já definiu anteriormente.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- Pode ou não ter `WeeklySchedule` cadastrado.

## Fluxo principal
1. Farmacêutico envia `GET /api/pharmacists/me/weekly-schedule` com token JWT.
2. Sistema extrai `pharmacistId` do token.
3. Busca todos os `WeeklySchedule` do farmacêutico, ordenados por `dayOfWeek asc`.
4. Busca `isOnline` do `PharmacistProfile`.
5. Retorna HTTP 200 com `{ schedule: [...], isOnline: boolean }`.

## Fluxos alternativos
- **Farmacêutico nunca configurou agenda**: retorna `{ schedule: [], isOnline: false }`.

## Fluxos de exceção
- **Token ausente ou inválido**: HTTP 401.

## Resultado esperado
Objeto com `schedule` (array de `WeeklySchedule` com `dayOfWeek`, `startTime`, `endTime`, `isActive`) e `isOnline` (boolean). Permite que o frontend pré-popule o formulário de agenda.

## Cenários de teste
- [ ] Dado farmacêutico com agenda para Segunda (09:00–17:00) e Quarta (08:00–12:00), quando GET /me/weekly-schedule, então retorna 2 registros ordenados por dayOfWeek
- [ ] Dado farmacêutico com `isOnline: true`, quando GET /me/weekly-schedule, então `isOnline: true` na resposta
- [ ] Dado farmacêutico sem agenda configurada, quando GET /me/weekly-schedule, então `schedule: []`

## Ambiguidades
- Nenhuma identificada. Fluxo simples e bem especificado.
