import type { PrismaClient, GameValidationMapping, Prisma } from '@prisma/client';
import { BaseRepository } from '../base/base.repository.js';

export class MappingRepository extends BaseRepository<GameValidationMapping, Prisma.GameValidationMappingCreateInput, Prisma.GameValidationMappingUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'gameValidationMapping');
  }

  async findActiveMappingsForGame(gameId: string): Promise<GameValidationMapping[]> {
    return this.prisma.gameValidationMapping.findMany({
      where: {
        gameId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        capability: true,
        provider: true,
        endpoint: true,
      },
      orderBy: { priority: 'asc' },
    });
  }

  async findActiveMappingForCapability(gameId: string, capabilityId: string): Promise<GameValidationMapping[]> {
    return this.prisma.gameValidationMapping.findMany({
      where: {
        gameId,
        capabilityId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        capability: true,
        provider: true,
        endpoint: true,
      },
      orderBy: { priority: 'asc' },
    });
  }
}
