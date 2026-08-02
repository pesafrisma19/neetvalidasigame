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

  // Providers & Endpoints (Using Transactions for Multi-table mutations)
  async getAllProviders(): Promise<Provider[]> {
    return this.providerRepo.findMany({}, { orderBy: { name: 'asc' } });
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

  // Mappings
  async getAllMappings(): Promise<GameValidationMapping[]> {
    return this.mappingRepo.findMany({}, { orderBy: { priority: 'asc' } });
  }

  async createMapping(data: Prisma.GameValidationMappingCreateInput): Promise<GameValidationMapping> {
    return this.mappingRepo.create(data);
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
