#!/bin/bash

BASE_DIR="/home/rafael/Área de trabalho/Projeto/telefarmacia-app"

echo "======================================================="
echo "Aplicando as atualizações de Agendamento (Scheduling)..."
echo "======================================================="

# 1. Atualiza o Backend e Prisma
cd "$BASE_DIR/backend"

# Insere as relações e o model Availability no schema.prisma sem quebrar o anterior
if ! grep -q "model Availability" prisma/schema.prisma; then
  sed -i '/pharmacistAppointments Appointment\[\]      @relation("PharmacistAppointments")/a \  availabilities         Availability[]     @relation("PharmacistAvailabilities")' prisma/schema.prisma
  
  cat << 'EOF' >> prisma/schema.prisma

model Availability {
  id           String   @id @default(uuid())
  pharmacistId String
  pharmacist   User     @relation("PharmacistAvailabilities", fields: [pharmacistId], references: [id])
  dateTime     DateTime
  isBooked     Boolean  @default(false)
}
EOF
fi

# Gera novamente o Prisma Client e empurra as mudanças pro banco
npx prisma generate
npx prisma db push

# Nota: Os arquivos PharmacistController.js, AppointmentController.js, 
# pharmacistRoutes.js, appointmentRoutes.js, PatientDashboard.jsx 
# e PharmacistProfile.jsx devem ser criados manualmente ou utilizando 
# um copy/paste do bloco de código acima devido ao seu tamanho extenso 
# para evitar erros de formatação no bash script.

# Injetando as rotas no app.js de forma segura
if ! grep -q "pharmacistRoutes" src/app.js; then
  sed -i "s/import authRoutes from '.\/routes\/authRoutes.js';/import authRoutes from '.\/routes\/authRoutes.js';\nimport pharmacistRoutes from '.\/routes\/pharmacistRoutes.js';\nimport appointmentRoutes from '.\/routes\/appointmentRoutes.js';/" src/app.js
  sed -i "s/app.use('\/api', userRoutes);/app.use('\/api', userRoutes);\napp.use('\/api', pharmacistRoutes);\napp.use('\/api', appointmentRoutes);/" src/app.js
fi

echo "======================================================="
echo "A base do banco de dados e rotas principais foi injetada!"
echo "1. Reinicie sua API Node (nodemon)"
echo "2. Por favor, cole os conteúdos dos arquivos Javascript/"
echo "   React listados acima para garantir a formatação correta."
echo "======================================================="