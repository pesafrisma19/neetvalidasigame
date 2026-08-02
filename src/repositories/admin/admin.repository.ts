import type { PrismaClient, AdminUser, AdminActivityLog, Prisma } from '@prisma/client';
import { BaseRepository } from '../base/base.repository.js';

export class AdminRepository extends BaseRepository<AdminUser, Prisma.AdminUserCreateInput, Prisma.AdminUserUpdateInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'adminUser');
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async createActivityLog(data: Prisma.AdminActivityLogCreateInput): Promise<AdminActivityLog> {
    return this.prisma.adminActivityLog.create({
      data,
    });
  }
}
