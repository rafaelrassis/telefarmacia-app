# Especificações — FarmaConsulta

Documentação gerada por engenharia reversa do código em Jun/2026, atualizada conforme os módulos foram implementados.

---

## Índice de specs

| Spec | Módulo(s) relacionado(s) | Link |
|---|---|---|
| Auth e Onboarding | `AuthController` · `authRoutes` · `authMiddleware` · login e-mail/senha · Google OAuth | [spec-auth.md](spec-auth.md) |
| Painel Administrativo | `AdminController` · `adminRoutes` · `adminMiddleware` · métricas · órfãs | [spec-admin.md](spec-admin.md) |

> O fluxo legado de agendamento por farmacêutico específico (`AppointmentController`, `BookingWizard.jsx`, agenda semanal/slots do farmacêutico, integração Google Meet) foi removido — o único fluxo de consulta é o sistema de filas (`FilaController`), sem spec própria ainda.

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
