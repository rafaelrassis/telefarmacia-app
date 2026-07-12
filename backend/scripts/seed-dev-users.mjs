import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SENHA_PADRAO = '123456';

async function upsertUser({ email, name, role }) {
  const password = await bcrypt.hash(SENHA_PADRAO, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password, role },
    create: { email, name, role, password },
  });
  console.log(`OK  ${role.padEnd(12)} ${email}`);
  return user;
}

async function main() {
  await upsertUser({ email: 'adm@adm.com', name: 'Admin', role: 'PACIENTE' });
  // Lembrete: adicione "adm@adm.com" em ADMIN_EMAILS no .env para liberar o painel admin.

  const paciente = await upsertUser({ email: 'paciente@paciente.com', name: 'Paciente Teste', role: 'PACIENTE' });
  await prisma.pacienteProfile.upsert({
    where: { userId: paciente.id },
    update: {},
    create: {
      userId: paciente.id,
      nomeCompleto: 'Paciente Teste',
      dataNascimento: new Date('1990-01-01'),
      genero: 'Não informado',
      cpf: '00000000000',
      aceiteTermos: true,
      dataAceite: new Date(),
      versaoTermos: '1.0',
      onboardingConcluido: true,
    },
  });

  const farmaceutico = await upsertUser({ email: 'farmaceutico@farmaceutico.com', name: 'Farmacêutico Teste', role: 'FARMACEUTICO' });
  await prisma.pharmacistProfile.upsert({
    where: { userId: farmaceutico.id },
    update: { isApproved: true },
    create: {
      userId: farmaceutico.id,
      crfNumber: '12345',
      crfUF: 'SP',
      bio: 'Farmacêutico de teste para desenvolvimento local.',
      tags: [],
      isApproved: true,
    },
  });

  console.log(`\nSenha para todas as contas: ${SENHA_PADRAO}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
