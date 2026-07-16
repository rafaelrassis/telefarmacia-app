# Especificações — FarmaConsulta

Documentação gerada por engenharia reversa do código em Jun/2026, atualizada conforme os módulos foram implementados.

---

## Índice de specs

| Spec | Módulo(s) relacionado(s) | Link |
|---|---|---|
| Auth e Onboarding | `AuthController` · `authRoutes` · `authMiddleware` · login e-mail/senha · Google OAuth | [spec-auth.md](spec-auth.md) |
| Alterar e Recuperar Senha | `PasswordController` · `contaRoutes` · `passwordResetLimiter` · alterar/definir senha · esqueci minha senha | [spec-alterar-recuperar-senha.md](spec-alterar-recuperar-senha.md) |
| Farmacêutico: Perfil, Agenda e Disponibilidade | `PharmacistController` · `pharmacistRoutes` · `BloqueioController` · agenda semanal/slots/bloqueios | [spec-farmaceutico.md](spec-farmaceutico.md) |
| Painel Administrativo | `AdminController` · `adminRoutes` · `adminMiddleware` · métricas · órfãs | [spec-admin.md](spec-admin.md) |

> O fluxo legado de agendamento com pagamento Stripe-like e Google Meet (`AppointmentController`, `PaymentController`, `googleCalendarService`, `BookingWizard.jsx`) foi removido — o único fluxo de consulta do paciente é o sistema de filas (`FilaController`), sem spec própria ainda. A agenda do próprio farmacêutico (`Availability`/`WeeklySchedule`/`BloqueioAgenda`) continua em uso — ver [spec-farmaceutico.md](spec-farmaceutico.md).

---

## Skills disponíveis no Claude Code

| Skill | Para que serve |
|---|---|
| [`start-dev`](../.claude/skills/start-dev/SKILL.md) | Sobe Docker + backend + frontend |
| [`db-migration`](../.claude/skills/db-migration/SKILL.md) | Padrão de migração SQL manual + prisma generate |

---

## Stack de referência

| Camada | Tecnologias |
|---|---|
| Backend | Node.js ESM · Express 5 · Prisma ORM v5 · PostgreSQL 15 · JWT 7d |
| Frontend | React 18 · Vite 5 (porta 5174) · Tailwind CSS v4 · React Router v7 |
| Auth | Google OAuth2 (`google-auth-library`) · login manual (bcrypt) · admin por `ADMIN_EMAILS` env var |
| Infra | Docker Compose · PostgreSQL 15 (porta 5432) |

---

## Backlog

_Sem itens pendentes no momento._
