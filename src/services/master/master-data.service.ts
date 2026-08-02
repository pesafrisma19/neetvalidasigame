import type { PrismaClient, Game, Provider, ProviderEndpoint, Capability, GameValidationMapping, TestAccount, Prisma } from '@prisma/client';
import type { GameRepository } from '../../repositories/game/game.repository.js';
import type { ProviderRepository, ProviderEndpointRepository } from '../../repositories/provider/provider.repository.js';
import type { CapabilityRepository } from '../../repositories/capability/capability.repository.js';
import type { MappingRepository } from '../../repositories/mapping/mapping.repository.js';

export class MasterDataService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly gameRepo: GameRepository,
    private readonly providerRepo: ProviderRepository,
    private readonly endpointRepo: ProviderEndpointRepository,
    private readonly capabilityRepo: CapabilityRepository,
    private readonly mappingRepo: MappingRepository
  ) {}

  // Games
  async getAllGames(): Promise<Game[]> {
    return this.gameRepo.findMany({}, { orderBy: { name: 'asc' } });
  }

  async createGame(data: Prisma.GameCreateInput): Promise<Game> {
    return this.gameRepo.create(data);
  }

  async updateGame(id: string, data: Prisma.GameUpdateInput): Promise<Game> {
    return this.gameRepo.update(id, data);
  }

  async deleteGame(id: string): Promise<Game> {
    return this.gameRepo.softDelete(id);
  }

  // Providers & Endpoints
  async getAllProviders(): Promise<Provider[]> {
    return this.providerRepo.findMany({}, { orderBy: { name: 'asc' } });
  }

  async createProvider(data: Prisma.ProviderCreateInput): Promise<Provider> {
    return this.providerRepo.create(data);
  }

  async updateProvider(id: string, data: Prisma.ProviderUpdateInput): Promise<Provider> {
    return this.providerRepo.update(id, data);
  }

  async deleteProvider(id: string): Promise<Provider> {
    return this.providerRepo.softDelete(id);
  }

  async getAllEndpoints(): Promise<ProviderEndpoint[]> {
    return this.endpointRepo.findMany({}, { orderBy: { priority: 'asc' } });
  }

  async createProviderWithEndpoint(
    providerData: Prisma.ProviderCreateInput,
    endpointData: Omit<Prisma.ProviderEndpointCreateInput, 'provider'>
  ): Promise<{ provider: Provider; endpoint: ProviderEndpoint }> {
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.provider.create({ data: providerData });
      const endpoint = await tx.providerEndpoint.create({
        data: {
          ...endpointData,
          provider: { connect: { id: provider.id } },
        },
      });
      return { provider, endpoint };
    });
  }

  // Capabilities
  async getAllCapabilities(): Promise<Capability[]> {
    return this.capabilityRepo.findAllActiveCapabilities();
  }

  async createCapability(data: Prisma.CapabilityCreateInput): Promise<Capability> {
    return this.capabilityRepo.create(data);
  }

  async updateCapability(id: string, data: Prisma.CapabilityUpdateInput): Promise<Capability> {
    return this.capabilityRepo.update(id, data);
  }

  async deleteCapability(id: string): Promise<Capability> {
    return this.capabilityRepo.softDelete(id);
  }

  // Mappings
  async getAllMappings(): Promise<GameValidationMapping[]> {
    return this.mappingRepo.findMany({}, { orderBy: { priority: 'asc' } });
  }

  async createMapping(data: Prisma.GameValidationMappingCreateInput): Promise<GameValidationMapping> {
    return this.mappingRepo.create(data);
  }

  async updateMapping(id: string, data: Prisma.GameValidationMappingUpdateInput): Promise<GameValidationMapping> {
    return this.mappingRepo.update(id, data);
  }

  async deleteMapping(id: string): Promise<GameValidationMapping> {
    return this.mappingRepo.softDelete(id);
  }

  // Test Accounts
  async getTestAccountsByGame(gameId: string): Promise<TestAccount[]> {
    return this.prisma.testAccount.findMany({
      where: { gameId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTestAccount(data: Prisma.TestAccountCreateInput): Promise<TestAccount> {
    return this.prisma.testAccount.create({ data });
  }
}
