import type { PrismaClient, Game, Prisma } from '@prisma/client';
import { BaseRepository } from '../base/base.repository.js';

export class GameRepository extends BaseRepository<Game, Prisma.GameCreateInput, Prisma.GameUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'game');
  }

  async findByCode(code: string): Promise<Game | null> {
    return this.prisma.game.findFirst({
      where: {
        code,
        deletedAt: null,
      },
    });
  }

  async findActiveGames(): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }
}
