---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Consultar slots disponíveis de um farmacêutico

## Contexto
Paciente (ou sistema) consulta os horários livres de um farmacêutico específico para selecionar quando agendar.

## Pré-condições
- `Availability` com `pharmacistId = :id`, `isBooked: false` e `dateTime >= agora` deve existir.
- Rota é pública — não requer autenticação.

## Fluxo principal
1. Cliente envia `GET /api/pharmacists/:id/availability`.
2. Sistema busca `Availability` onde `pharmacistId = :id`, `isBooked: false`, `dateTime >= now()`.
3. Retorna array ordenado por `dateTime asc`.
4. Retorna HTTP 200.

## Fluxos alternativos
- **Farmacêutico sem slots livres**: retorna `[]` com HTTP 200.
- **Farmacêutico não encontrado**: ⚠️ ambiguidade — ver abaixo.

## Fluxos de exceção
- Nenhum documentado além de erro genérico de banco (HTTP 500).

## Resultado esperado
Array de objetos `Availability` (`id`, `pharmacistId`, `dateTime`, `isBooked: false`), ordenados cronologicamente, todos com `dateTime` no futuro.

## Cenários de teste
- [ ] Dado farmacêutico com slots às 10:00 (livre) e 11:00 (reservado), quando GET /availability, então retorna apenas o de 10:00
- [ ] Dado slot com `dateTime` no passado (livre), quando GET /availability, então **não** aparece
- [ ] Dado farmacêutico sem nenhum slot, quando GET /availability, então retorna `[]`
- [ ] Dado slots em datas diferentes, quando GET /availability, então estão ordenados do mais próximo para o mais distante

## Ambiguidades
- A spec não define o comportamento para `:id` inexistente — provavelmente retorna `[]`, mas não está documentado explicitamente.
- Não há limite de quantos slots são retornados — um farmacêutico com 28 dias × 12 slots = 336 slots todos na resposta.
