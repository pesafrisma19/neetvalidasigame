import { PrismaClient } from '@prisma/client';

// Shared Singleton PrismaClient instance to prevent connection pool exhaustion
export const prisma = new PrismaClient();
