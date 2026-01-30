import { PrismaClient } from '@prisma/client';
import { isDevelopment } from '../config/index.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
