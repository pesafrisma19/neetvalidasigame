import type { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected constructor(
    protected readonly prisma: PrismaClient,
    protected readonly modelName: keyof PrismaClient
  ) {}

  // Access the Prisma model dynamically with type safety
  protected get model(): any {
    return this.prisma[this.modelName];
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findMany(where: Record<string, unknown> = {}, options: { skip?: number; take?: number; orderBy?: unknown } = {}): Promise<T[]> {
    return this.model.findMany({
      where: {
        ...where,
        deletedAt: null,
      },
      skip: options.skip,
      take: options.take,
      orderBy: options.orderBy,
    });
  }

  async count(where: Record<string, unknown> = {}): Promise<number> {
    return this.model.count({
      where: {
        ...where,
        deletedAt: null,
      },
    });
  }

  async create(data: CreateInput): Promise<T> {
    return this.model.create({
      data,
    });
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, deletedBy?: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        ...(deletedBy ? { updatedBy: deletedBy } : {}),
      },
    });
  }

  async hardDelete(id: string): Promise<T> {
    return this.model.delete({
      where: { id },
    });
  }
}
