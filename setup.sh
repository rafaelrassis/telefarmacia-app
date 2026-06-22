#!/bin/bash

BASE_DIR="/home/rafael/Área de trabalho/Projeto/telefarmacia-app"

echo "======================================================="
echo "Iniciando a criação do ecossistema Telefarmácia..."
echo "======================================================="

mkdir -p "$BASE_DIR"
cd "$BASE_DIR" || exit

# ---------------------------------------------------------
# 1. Configuração do Frontend
# ---------------------------------------------------------
echo "[1/2] Configurando o Frontend (React + Vite + Tailwind)..."
if [ ! -d "frontend" ]; then
  npm create vite@latest frontend -- --template react
  cd frontend
  npm install
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  cd ..
else
  echo "A pasta frontend já existe. Pulando etapa de criação do Vite."
fi

# ---------------------------------------------------------
# 2. Configuração do Backend
# ---------------------------------------------------------
echo "[2/2] Configurando o Backend (Express + Prisma)..."
mkdir -p backend/src/controllers backend/src/routes backend/prisma
cd backend

if [ ! -f "package.json" ]; then
  npm init -y
  npm pkg set type="module"
  npm install express cors dotenv
  npm install -D prisma nodemon
fi

# Criação do arquivo .env do Backend
cat << 'EOF' > .env
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://usuario:senha@localhost:5432/telefarmacia?schema=public"
EOF

# Criação do arquivo de Schema do Prisma
cat << 'EOF' > prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  PACIENTE
  FARMACEUTICO
}

enum AppointmentStatus {
  PENDENTE_PAGAMENTO
  AGENDADO
  CONCLUIDO
  CANCELADO
}

model User {
  id                     String             @id @default(uuid())
  email                  String             @unique
  name                   String
  role                   UserRole
  googleId               String?            @unique
  createdAt              DateTime           @default(now())
  pharmacistProfile      PharmacistProfile?
  patientAppointments    Appointment[]      @relation("PatientAppointments")
  pharmacistAppointments Appointment[]      @relation("PharmacistAppointments")
}

model PharmacistProfile {
  id         String   @id @default(uuid())
  userId     String   @unique
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  crfNumber  String
  crfUF      String
  bio        String?
  tags       String[]
  isApproved Boolean  @default(false)
}

model Appointment {
  id              String            @id @default(uuid())
  patientId       String
  patient         User              @relation("PatientAppointments", fields: [patientId], references: [id])
  pharmacistId    String
  pharmacist      User              @relation("PharmacistAppointments", fields: [pharmacistId], references: [id])
  dateTime        DateTime
  durationMinutes Int
  status          AppointmentStatus @default(PENDENTE_PAGAMENTO)
  googleMeetLink  String?
  pixId           String?
  recommendations String?           @db.Text
  createdAt       DateTime          @default(now())
}
EOF

# Garantindo a instalação e geração do Client do Prisma
npm install @prisma/client
npx prisma generate

# Criação do server.js
cat << 'EOF' > src/server.js
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
EOF

# Adicionando dotenv de forma segura no app.js existente
if grep -q "import cors from 'cors';" src/app.js; then
  # Verifica se dotenv já foi inserido
  if ! grep -q "dotenv/config" src/app.js; then
    sed -i "s/import cors from 'cors';/import cors from 'cors';\nimport 'dotenv\/config';/" src/app.js
    echo "Import do dotenv/config adicionado ao app.js"
  fi
fi

cd ..

echo "======================================================="
echo "Automação finalizada com sucesso!"
echo ""
echo "Para subir o banco de dados: docker-compose up -d"
echo "Para criar as tabelas no banco: cd backend && npx prisma db push"
echo "======================================================="