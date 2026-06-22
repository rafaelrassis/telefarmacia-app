# Especificações — FarmaConsulta

Documentação gerada por engenharia reversa do código em Jun/2026, atualizada conforme os módulos foram implementados.

---

## Índice de specs

| Spec | Módulo(s) relacionado(s) | Link |
|---|---|---|
| Auth e Onboarding | `AuthController` · `authRoutes` · `authMiddleware` · login e-mail/senha · Google OAuth | [spec-auth.md](spec-auth.md) |
| Farmacêutico: Perfil, Agenda e Ativação | `PharmacistController` · `pharmacistRoutes` · upload de docs · cron de slots | [spec-farmaceutico.md](spec-farmaceutico.md) |
| Agendamentos e Consultas | `AppointmentController` · `appointmentRoutes` · `EXPIRADA` · reserva via créditos | [spec-agendamento.md](spec-agendamento.md) |
| Tela de Agendamento (Wizard) | `BookingWizard.jsx` · wizard 3 etapas · botão no dashboard | [spec-booking-wizard.md](spec-booking-wizard.md) |
| Pagamento Simulado e Carteira | `PagamentoController` · `PaymentController` · model `Carteira` · model `Pagamento` | [spec-pagamento.md](spec-pagamento.md) |
| Painel Administrativo | `AdminController` · `adminRoutes` · `adminMiddleware` · métricas · órfãs | [spec-admin.md](spec-admin.md) |
| Google Meet (legado, removido) | `googleCalendarService` · integração removida no módulo 4 | [spec-google-meet.md](spec-google-meet.md) |

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

| # | Módulo | Problema |
|---|---|---|
| 1 | Farmacêutico | Salvar agenda semanal apaga todos os slots livres futuros |
