import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gera horários disponíveis para um farmacêutico respeitando o Buffer Time.
 * @param {string} pharmacistId - ID do usuário do farmacêutico no banco.
 * @param {string} startDateIso - Data de início (Ex: '2026-06-20')
 * @param {number} startHour - Hora de início do expediente (Ex: 9)
 * @param {number} endHour - Hora de término do expediente (Ex: 17)
 * @param {number} slotDurationMinutes - Duração da consulta (Ex: 30)
 * @param {number} bufferMinutes - Tempo de respiro obrigatório (Ex: 15)
 */
async function generatePharmacistAvailability(
  pharmacistId, 
  startDateIso, 
  startHour = 9, 
  endHour = 17, 
  slotDurationMinutes = 30, 
  bufferMinutes = 15
) {
  console.log(`⏳ Iniciando geração de agenda para o Farmacêutico: ${pharmacistId}...`);
  
  const availabilitiesData = [];
  
  // Define o ponteiro inicial do dia desejado
  let currentPointer = new Date(`${startDateIso}T00:00:00`);
  currentPointer.setHours(startHour, 0, 0, 0);
  
  // Define o limite do expediente para aquele dia
  const endExpedient = new Date(`${startDateIso}T00:00:00`);
  endExpedient.setHours(endHour, 0, 0, 0);

  // Varre o dia gerando os blocos enquanto houver tempo dentro do expediente
  while (currentPointer.getTime() + (slotDurationMinutes * 60 * 1000) <= endExpedient.getTime()) {
    
    // Adiciona o horário atual para inserção
    availabilitiesData.push({
      pharmacistId: pharmacistId,
      dateTime: new Date(currentPointer),
      isBooked: false
    });

    console.log(`   [Slot Criado]: ${currentPointer.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);

    // REGRA DE OURO: Avança o ponteiro somando o tempo de consulta + o Buffer Time de respiro
    const minutesToAdvance = slotDurationMinutes + bufferMinutes;
    currentPointer.setMinutes(currentPointer.getMinutes() + minutesToAdvance);
  }

  // Insere em lote (Bulk Insert) no PostgreSQL para máxima performance
  if (availabilitiesData.length > 0) {
    const created = await prisma.availability.createMany({
      data: availabilitiesData,
      skipDuplicates: true // Evita duplicar se rodar o script duas vezes
    });
    
    console.log(`✅ Sucesso! ${created.count} horários criados com respiro de ${bufferMinutes}min.`);
  } else {
    console.log('⚠️ Nenhum horário pôde ser gerado no intervalo de expediente fornecido.');
  }
}

async function main() {
  // 1. Busca o primeiro usuário farmacêutico ativo para testar
  const pharmacist = await prisma.user.findFirst({
    where: { role: 'FARMACEUTICO' }
  });

  if (!pharmacist) {
    console.error('❌ Nenhum usuário com a role "FARMACEUTICO" foi encontrado no banco de dados.');
    console.error('👉 Faça um onboarding primeiro ou crie um usuário manualmente pelo Prisma Studio.');
    return;
  }

  // 2. Define a data de teste (Ex: Próxima segunda-feira)
  const dataTeste = '2026-06-22'; 

  // 3. Executa a geração automática
  await generatePharmacistAvailability(
    pharmacist.id, 
    dataTeste, 
    9,   // Início: 09:00
    18,  // Fim: 18:00
    30,  // Consulta: 30 minutos
    15   // Buffer obrigatório: 15 minutos
  );
}

main()
  .catch((e) => {
    console.error('❌ Erro ao rodar o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
