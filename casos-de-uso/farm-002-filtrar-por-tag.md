---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Listar farmacêuticos filtrados por tag

## Contexto
Paciente quer encontrar um farmacêutico com especialidade específica (ex.: "dermatologia", "pediatria").

## Pré-condições
- Mesmas do UC farm-001.

## Fluxo principal
1. Cliente envia `GET /api/pharmacists?tag=dermatologia`.
2. Sistema aplica filtro `tags: { has: "dermatologia" }` além dos filtros base de farm-001.
3. Retorna HTTP 200 com array filtrado.

## Fluxos alternativos
- **Tag não existe em nenhum farmacêutico**: retorna `[]` com HTTP 200.
- **Combinação com outros filtros** (`?tag=X&online=true`): ambos os filtros são aplicados simultaneamente.

## Fluxos de exceção
- **Tag vazia (`?tag=`)**: ⚠️ ambiguidade — ver abaixo.

## Resultado esperado
Somente farmacêuticos aprovados que possuem a tag exata no array `tags[]`. A comparação é case-sensitive (Prisma `has`).

## Cenários de teste
- [ ] Dado farmacêutico A com tags `["diabetes", "hipertensão"]` e B com `["pediatria"]`, quando `?tag=diabetes`, então retorna apenas A
- [ ] Dado que nenhum farmacêutico tem a tag `"oncologia"`, quando `?tag=oncologia`, então retorna `[]`
- [ ] Dado farmacêutico com tag `"Diabetes"` (maiúsculo), quando `?tag=diabetes` (minúsculo), então **não** retorna (comparação exata)

## Ambiguidades
- A spec diz "tag exata" mas não define se a comparação é case-sensitive. O Prisma `has` é case-sensitive por padrão — verificar se isso é o comportamento desejado.
- `?tag=` (valor vazio) provavelmente retorna todos (filtro ignorado), mas não está documentado.
