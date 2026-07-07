# FarmaConsulta — Plataforma de Teleconsulta Farmacêutica

[![Tests](https://github.com/rafaelrassis/telefarmacia-app/actions/workflows/tests.yml/badge.svg)](https://github.com/rafaelrassis/telefarmacia-app/actions/workflows/tests.yml)

Conecta pacientes a farmacêuticos para consultas remotas (agendadas ou urgentes) com triagem, receitas digitais e histórico clínico.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS v4, React Router v7 |
| Backend | Node.js (ESM), Express 5, Prisma ORM v5 |
| Banco de dados | PostgreSQL 15 |
| Autenticação | JWT + Google OAuth 2.0 |
| Armazenamento | Upload local (Multer) + PDFKit (geração de receitas) |
| Serviços externos | Google Calendar API, Nodemailer (SMTP) |
| Tarefas agendadas | node-cron |
| PWA | vite-plugin-pwa |

---

## Estrutura do repositório

```
telefarmacia-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelos do banco
│   │   └── migrations/            # Histórico de migrations
│   ├── src/
│   │   ├── app.js                 # Express + middlewares
│   │   ├── controllers/           # Lógica de negócio
│   │   ├── middlewares/           # Auth + admin guards
│   │   ├── routes/                # Definição de rotas
│   │   ├── services/              # Email, Google Calendar
│   │   └── utils/                 # Multer, logAction
│   ├── scripts/                   # Migrations manuais (campos raw)
│   └── server.js                  # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/            # Componentes React
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/                 # Páginas (rotas)
│   │   └── App.jsx
│   └── vite.config.js
├── casos-de-uso/                  # Especificações UC
├── especificacoes/                # Specs por módulo
└── docs/
    └── TECHNICAL.md               # Documentação técnica completa
```

---

## Pré-requisitos

- Node.js 20+
- PostgreSQL 15 rodando localmente ou via Docker
- Conta Google Cloud (para OAuth e Calendar API) — opcional em dev

---

## Configuração

### Backend — `backend/.env`

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/telefarmacia"
JWT_SECRET="segredo-minimo-32-chars"
PORT=3000
FRONTEND_URL="http://localhost:5174"

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Calendar (credenciais de conta de serviço)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# E-mail (opcional em dev)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ADMIN_NOTIFICATION_EMAIL=

# Upload
UPLOAD_DIR=./uploads
```

### Frontend — `frontend/.env`

```env
VITE_API_URL="http://localhost:3000"
VITE_GOOGLE_CLIENT_ID=""
```

---

## Executando em desenvolvimento

```bash
# 1. Banco de dados
cd backend
npx prisma migrate dev

# 2. Backend (porta 3000)
npm run dev

# 3. Frontend (porta 5174)
cd ../frontend
npm install
npm run dev
```

Acesse `http://localhost:5174`.

---

## Funcionalidades principais

| Módulo | Descrição |
|--------|-----------|
| Autenticação | E-mail/senha + Google OAuth. JWT com expiração configurável. |
| Onboarding de paciente | Wizard em 3 etapas: dados pessoais → dados de saúde → termo de consentimento LGPD |
| Agendamento | Seleção de farmacêutico, slot de horário, tipo de consulta e pagamento via carteira |
| Fila urgente | Consulta sem agendamento prévio; farmacêutico online aceita em tempo real |
| Triagem | Formulário pré-consulta (tipo, motivo, medicamentos, condições de saúde) preenchido pelo paciente |
| Consulta | Farmacêutico acessa triagem, elabora observações, emite receita (PDF gerado server-side) |
| Documentos | Paciente acessa todas as receitas e orientações de consultas concluídas |
| Compartilhamento | Web Share API com File object — zero URL pública exposta |
| Dependentes | Paciente pode gerenciar até 6 dependentes e realizar consultas em nome deles |
| Avaliações | Paciente avalia o farmacêutico após cada consulta concluída |
| Onde Comprar | Parceiros afiliados com rastreamento de cliques |
| Ganhos | Relatório de receita do farmacêutico por período |
| Admin | Aprovação de farmacêuticos, configuração de sistema |
| LGPD | Exportação de dados pessoais e exclusão de conta (Art. 18 LGPD) |
| PWA | Instalável em Android/iOS, suporte offline básico |

---

## Variáveis de ambiente de produção adicionais

```env
NODE_ENV=production
UPLOAD_DIR=/var/www/uploads      # fora do diretório da app
FRONTEND_URL=https://seu-dominio.com
```

---

## Versão estável

A tag `v0.1-testado-2x2` marca a versão validada pelo roteiro de testes 2×2 (2 pacientes × 2 farmacêuticos) cobrindo isolamento de dados, fluxos de consulta e LGPD.

---

## Documentação

- [Documentação Técnica Completa](docs/TECHNICAL.md)
- [Especificações por módulo](especificacoes/)
- [Casos de uso](casos-de-uso/)
