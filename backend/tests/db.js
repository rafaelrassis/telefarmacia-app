import { PrismaClient } from '@prisma/client';

// Instância compartilhada entre os helpers e os arquivos de teste. Cada
// arquivo de teste roda isolado (Vitest com fileParallelism desabilitado),
// então uma instância por arquivo é aceitável — desconectada em afterAll
// (ver setup.js).
export const prisma = new PrismaClient();
