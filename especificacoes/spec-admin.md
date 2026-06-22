# Spec — Painel Administrativo

## O que faz

Fornece ao(s) administrador(es) visibilidade e controle sobre farmacêuticos, pacientes e consultas. A identidade de admin é baseada em email — não há tabela de admins no banco.

---

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/admin/stats` | JWT + Admin | Métricas gerais da plataforma |
| `GET` | `/api/admin/pharmacists` | JWT + Admin | Lista todos os farmacêuticos |
| `GET` | `/api/admin/patients` | JWT + Admin | Lista todos os pacientes |
| `GET` | `/api/admin/appointments` | JWT + Admin | Lista as últimas 100 consultas |
| `PATCH` | `/api/admin/pharmacists/:userId/approve` | JWT + Admin | Aprova farmacêutico |
| `PATCH` | `/api/admin/pharmacists/:userId/revoke` | JWT + Admin | Revoga aprovação |
| `DELETE` | `/api/admin/pharmacists/:userId` | JWT + Admin | Descadastra farmacêutico |

---

## Regras de negócio

### Proteção de rotas — `adminMiddleware`

Aplicado em sequência após `authMiddleware` (que valida o JWT):

```
authMiddleware → adminMiddleware → handler
```

O `adminMiddleware` lê `ADMIN_EMAILS` a cada requisição (não usa o campo `isAdmin` do JWT). Isso significa que **revogar um email de admin no env + reiniciar o servidor** bloqueia o acesso imediatamente, mesmo que o usuário ainda tenha um JWT válido com `isAdmin: true`.

Retorna `403` se o email do usuário autenticado não estiver na lista.

### Configuração de admins

```
# .env
ADMIN_EMAILS="email1@exemplo.com,email2@exemplo.com"
```

Não há UI para gerenciar admins — a lista é configurada diretamente no env.

### Métricas (`GET /api/admin/stats`)

Retorna em uma única query paralela:
- `totalPatients`: total de usuários com `role: PACIENTE`
- `totalPharmacists`: total de usuários com `role: FARMACEUTICO`
- `pendingApprovals`: farmacêuticos com `isApproved: false`
- `totalAppointments`: soma de todos os status
- `completedAppointments`, `scheduledAppointments`, `cancelledAppointments`

### Aprovação de farmacêutico (`PATCH .../approve`)

- Seta `PharmacistProfile.isApproved = true`.
- **Não envia email** ao farmacêutico. Ele precisa clicar em "Verificar status" no dashboard ou relogar.
- Farmacêutico aprovado pode gerar horários e aparecer para pacientes.

### Revogação (`PATCH .../revoke`)

- Seta `PharmacistProfile.isApproved = false`.
- Farmacêutico não gera novos horários.
- Slots futuros já gerados **permanecem** — pacientes ainda podem ver e até reservar (bug latente).
- Farmacêutico desaparece da listagem pública (filtro `isApproved: true`).

### Descadastro (`DELETE .../pharmacists/:userId`)

Usa transação:
1. Deleta **todos os slots de disponibilidade** do farmacêutico (`Availability.deleteMany`).
2. Deleta o `PharmacistProfile`.
3. Atualiza `User.role` para `'PACIENTE'` — **preserva o histórico de consultas**.

O usuário continua existindo no sistema como paciente. Suas consultas passadas continuam acessíveis.

### Listagem de consultas (`GET /api/admin/appointments`)

- Retorna as **últimas 100** consultas, ordenadas por `createdAt desc`.
- Inclui dados resumidos de paciente e farmacêutico (`id`, `name`, `email`).
- Sem paginação — limite hardcoded de 100.

---

## Entradas / Saídas

### `GET /api/admin/stats`
```
200: {
  totalPatients, totalPharmacists, pendingApprovals,
  totalAppointments, completedAppointments,
  scheduledAppointments, cancelledAppointments
}
```

### `PATCH /api/admin/pharmacists/:userId/approve`
```
200: { message: "Farmacêutico aprovado com sucesso." }
404: { error: "Perfil não encontrado." }
```

### `DELETE /api/admin/pharmacists/:userId`
```
200: { message: "Farmacêutico descadastrado. Conta convertida para paciente." }
404: { error: "Farmacêutico não encontrado." }
```

---

## Variáveis de ambiente

| Var | Descrição |
|---|---|
| `ADMIN_EMAILS` | Lista de emails de admin separados por vírgula |

---

## Limitações conhecidas

- **Bug na revogação**: slots futuros não são removidos quando a aprovação é revogada. Um farmacêutico revogado pode ter horários que ficam visíveis via `GET /api/pharmacists/:id/availability` (a rota pública não filtra por `isApproved`).
- **Sem paginação** em nenhuma listagem admin — em escala pode causar timeout ou memory issues.
- **Sem log de ações admin**: aprovações, revogações e exclusões não são auditadas em nenhuma tabela.
- **Sem proteção de consultas futuras na exclusão**: ao deletar um farmacêutico, consultas futuras AGENDADAS não são canceladas automaticamente.
