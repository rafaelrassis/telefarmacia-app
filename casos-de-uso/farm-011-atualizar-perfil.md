---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico atualiza perfil público

## Contexto
Farmacêutico quer atualizar sua bio, especialidades (tags) ou chave PIX (usada no repasse). Bio/tags são exibidas ao paciente após o aceite de uma consulta na fila.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- `PharmacistProfile` deve existir (criado no onboarding).

## Fluxo principal
1. Farmacêutico envia `PATCH /api/pharmacists/profile` com `{ bio?, tags?, chavePix? }`.
2. Sistema aplica apenas os campos presentes no body (patch parcial).
3. Persiste via `prisma.pharmacistProfile.update`.
4. Retorna HTTP 200 `{ message, profile }`.

## Fluxos alternativos
- **Apenas `bio` enviada**: somente bio é atualizada; `tags`/`chavePix` permanecem inalterados.
- **`tags: []`**: limpa todas as tags do farmacêutico.
- **`chavePix: ""`**: salva como `null` (limpa o campo).

## Fluxos de exceção
- **Token inválido**: HTTP 401.
- **Role ≠ FARMACEUTICO**: HTTP 403 `{ error: "Acesso restrito a farmacêuticos." }`.
- **`PharmacistProfile` não existe**: ⚠️ Prisma lançaria erro de not found — comportamento não definido na spec.

## Resultado esperado
`PharmacistProfile` atualizado com os campos informados. Campos não enviados permanecem com valor anterior. Resposta inclui o perfil completo atualizado.

## Cenários de teste
- [ ] Dado body `{ bio: "Nova bio" }`, quando PATCH /profile, então apenas bio atualizada, tags inalteradas
- [ ] Dado body `{ tags: ["diabetes", "hipertensão"] }`, quando PATCH /profile, então tags atualizadas
- [ ] Dado body `{ tags: [] }`, quando PATCH /profile, então tags viram array vazio
- [ ] Dado paciente autenticado tentando PATCH /profile, quando PATCH, então HTTP 403
- [ ] Dado body vazio `{}`, quando PATCH /profile, então perfil inalterado, HTTP 200

## Ambiguidades
- A spec não limita o tamanho de `bio` ou o número de `tags`. Sem validação, um farmacêutico poderia salvar uma bio com 1 MB.
- Não está definido se `crfNumber`, `crfUF` e `isApproved` podem ser alterados por essa rota — a implementação não inclui esses campos no patch, mas a spec não os lista explicitamente como imutáveis.
