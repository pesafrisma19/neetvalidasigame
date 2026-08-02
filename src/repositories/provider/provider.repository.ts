import type { PrismaClient, Provider, ProviderEndpoint, Prisma } from '@prisma/client';
import { BaseRepository } from '../base/base.repository.js';

export class ProviderRepository extends BaseRepository<Provider, Prisma.ProviderCreateInput, Prisma.ProviderUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'provider');
  }

  async findByCode(code: string): Promise<Provider | null> {
    return this.prisma.provider.findFirst({
      where: {
        code,
        deletedAt: null,
      },
      include: {
        endpoints: {
          where: { deletedAt: null },
        },
      },
    });
  }

  async findActiveProviders(): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        endpoints: {
          where: { isActive: true, deletedAt: null },
          orderBy: { priority: 'asc' },
        },
      },
    });
  }
}

export class ProviderEndpointRepository extends BaseRepository<ProviderEndpoint, Prisma.ProviderEndpointCreateInput, Prisma.ProviderEndpointUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'providerEndpoint');
  }

  async findActiveByProviderId(providerId: string): Promise<ProviderEndpoint[]> {
    return this.prisma.providerEndpoint.findMany({
      where: {
        providerId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { priority: 'asc' },
    });
  }
}
