---
spec: especificacoes/spec-farmaceutico.md
status: draft
---

# Farmacêutico não aprovado tenta salvar agenda semanal

## Contexto
Farmacêutico que acabou de se cadastrar (ou foi desativado pelo admin) tenta configurar sua agenda antes de ter sido aprovado.

## Pré-condições
- Usuário autenticado com `role: FARMACEUTICO`.
- `pharmacistProfile.isApproved: false`.

## Fluxo principal (de exceção)
1. Farmacêutico envia `PUT /api/pharmacists/weekly-schedule` com schedule válido.
2. Sistema verifica `isApproved`.
3. Retorna HTTP 403 `{ error: "Conta não aprovada pelo administrador." }`.
4. Nenhuma alteração é feita no banco.

## Resultado esperado
Nenhum `WeeklySchedule` criado ou atualizado. Nenhum `Availability` criado ou deletado. `isOnline` não alterado.

## Cenários de teste
- [ ] Dado farmacêutico com `isApproved: false`, quando PUT weekly-schedule com schedule válido, então HTTP 403
- [ ] Dado farmacêutico com `isApproved: false`, quando PUT weekly-schedule, então nenhum slot criado no banco
- [ ] Dado farmacêutico recém-aprovado (`isApproved: true`), quando PUT weekly-schedule, então HTTP 200 (confirma que aprovação desbloqueia)

## Ambiguidades
- Nenhuma. Comportamento explícito na spec.
