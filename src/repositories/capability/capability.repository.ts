import type { PrismaClient, Capability, CapabilityCode, Prisma } from '@prisma/client';
import { BaseRepository } from '../base/base.repository.js';

export class CapabilityRepository extends BaseRepository<Capability, Prisma.CapabilityCreateInput, Prisma.CapabilityUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'capability');
  }

  async findByCodeAndVersion(code: CapabilityCode, version = 'v1'): Promise<Capability | null> {
    return this.prisma.capability.findFirst({
      where: {
        code,
        version,
        deletedAt: null,
      },
    });
  }

  async findAllActiveCapabilities(): Promise<Capability[]> {
    return this.prisma.capability.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { code: 'asc' },
    });
  }
}
