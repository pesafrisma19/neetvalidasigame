import { prisma } from '../../lib/prisma.js';
import type { User } from '@prisma/client';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findPaginated(
    search?: string,
    skip = 0,
    take = 20,
    sortBy: 'createdAt' | 'name' | 'email' | 'balance' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<User[]> {
    const where: any = { deletedAt: null };

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
      ];
    }

    return (await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        balance: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    })) as unknown as User[];

  }

  async countPaginated(search?: string): Promise<number> {
    const where: any = { deletedAt: null };

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
      ];
    }

    return prisma.user.count({ where });
  }
}

