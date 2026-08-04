import type { PrismaClient, Game, Provider, ProviderEndpoint, Capability, GameValidationMapping, TestAccount, Prisma } from '@prisma/client';
import type { GameRepository } from '../../repositories/game/game.repository.js';
import type { ProviderRepository, ProviderEndpointRepository } from '../../repositories/provider/provider.repository.js';
import type { CapabilityRepository } from '../../repositories/capability/capability.repository.js';
import type { MappingRepository } from '../../repositories/mapping/mapping.repository.js';
import type { UserRepository } from '../../repositories/user/user.repository.js';

export class MasterDataService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly gameRepo: GameRepository,
    private readonly providerRepo: ProviderRepository,
    private readonly endpointRepo: ProviderEndpointRepository,
    private readonly capabilityRepo: CapabilityRepository,
    private readonly mappingRepo: MappingRepository,
    private readonly userRepo?: UserRepository
  ) {}


  // ============================================
  // 1. GAMES CRUD & RECYCLE BIN RESTORE
  // ============================================
  async getAllGames(): Promise<Game[]> {
    return this.gameRepo.findMany({}, { orderBy: { name: 'asc' } });
  }

  async getDeletedGames(): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });
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

  async restoreGame(id: string): Promise<Game> {
    return this.prisma.game.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });
  }

  // ============================================
  // 2. PROVIDERS CRUD & RECYCLE BIN RESTORE
  // ============================================
  async getAllProviders(): Promise<Provider[]> {
    return this.providerRepo.findMany({}, { orderBy: { name: 'asc' } });
  }

  async getDeletedProviders(): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });
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

  async restoreProvider(id: string): Promise<Provider> {
    return this.prisma.provider.update({
      where: { id },
      data: { deletedAt: null, status: 'ACTIVE' },
    });
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

  // ============================================
  // 3. CAPABILITIES CRUD & RECYCLE BIN RESTORE
  // ============================================
  async getAllCapabilities(): Promise<Capability[]> {
    return this.capabilityRepo.findAllActiveCapabilities();
  }

  async getDeletedCapabilities(): Promise<Capability[]> {
    return this.prisma.capability.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });
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

  async restoreCapability(id: string): Promise<Capability> {
    return this.prisma.capability.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  // ============================================
  // 4. MAPPINGS CRUD & RECYCLE BIN RESTORE
  // ============================================
  async getAllMappings(): Promise<GameValidationMapping[]> {
    return this.prisma.gameValidationMapping.findMany({
      where: { deletedAt: null },
      include: {
        game: true,
        capability: true,
        provider: true,
        endpoint: true,
      },
      orderBy: { priority: 'asc' },
    });
  }

  async getDeletedMappings(): Promise<GameValidationMapping[]> {
    return this.prisma.gameValidationMapping.findMany({
      where: { deletedAt: { not: null } },
      include: {
        game: true,
        capability: true,
        provider: true,
        endpoint: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
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

  async restoreMapping(id: string): Promise<GameValidationMapping> {
    return this.prisma.gameValidationMapping.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });
  }

  // ============================================
  // 5. TEST ACCOUNTS
  // ============================================
  async getTestAccountsByGame(gameId: string): Promise<TestAccount[]> {
    return this.prisma.testAccount.findMany({
      where: { gameId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTestAccount(data: Prisma.TestAccountCreateInput): Promise<TestAccount> {
    return this.prisma.testAccount.create({ data });
  }

  // ============================================
  // 6. USER MANAGEMENT
  // ============================================
  async getAllUsers(
    search?: string,
    page = 1,
    limit = 20,
    sortBy: 'createdAt' | 'name' | 'email' | 'balance' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const validLimit = Math.min(Math.max(1, limit), 100);
    const validPage = Math.max(1, page);
    const skip = (validPage - 1) * validLimit;

    if (this.userRepo) {
      const [users, totalRecords] = await Promise.all([
        this.userRepo.findPaginated(search, skip, validLimit, sortBy, sortOrder),
        this.userRepo.countPaginated(search),
      ]);
      return {
        users,
        meta: {
          page: validPage,
          limit: validLimit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / validLimit),
        },
      };
    }

    const where: any = { deletedAt: null };
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [users, totalRecords] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: validLimit,
        orderBy: { [sortBy]: sortOrder },
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
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      meta: {
        page: validPage,
        limit: validLimit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / validLimit),
      },
    };
  }

  async getUserById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
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
      },
    });
  }
}

