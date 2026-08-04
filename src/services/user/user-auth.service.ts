import { sign } from 'hono/jwt';
import bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'node:crypto';
import { env } from '../../config/env.config.js';
import { prisma } from '../../lib/prisma.js';
import type { UserRepository } from '../../repositories/user/user.repository.js';
import type { User } from '@prisma/client';

export interface UserRegisterDTO {
  name: string;
  email: string;
  password: string;
  companyName?: string;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface UserAuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    companyName: string | null;
    balance: number;
    role: string;
  };
  apiKey?: {
    id: string;
    clientName: string;
    keyPrefix: string;
    rawKey: string; // ONLY RETURNED ONCE UPON REGISTRATION
  };
}

export class UserAuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(dto: UserRegisterDTO): Promise<UserAuthResponse> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate 1st Live API Key for the new partner user
    const rawKey = `nv_live_${randomBytes(16).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 15);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const clientName = (dto.companyName && dto.companyName.trim() !== '') ? dto.companyName.trim() : `${dto.name.trim()} Key`;

    // Execute atomic transaction for User + ApiKey + Signup Bonus Transaction
    const [newUser, newApiKey] = await prisma.$transaction(async (tx) => {
      // 1. Create User Account with Initial Rp 5.000 Free Saldo Bonus
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          password: hashedPassword,
          companyName: dto.companyName?.trim() || null,
          balance: 5000,
          role: 'USER',
        },
      });

      // 2. Create Initial API Key
      const apiKey = await tx.apiKey.create({
        data: {
          userId: user.id,
          clientName: clientName,
          keyHash: keyHash,
          keyPrefix: keyPrefix,
          rateLimit: 60, // Default 60 req/min
        },
      });

      // 3. Create Audit Mutation Log for Initial Signup Bonus
      await tx.balanceTransaction.create({
        data: {
          userId: user.id,
          apiKeyId: apiKey.id,
          amount: 5000,
          balanceBefore: 0,
          balanceAfter: 5000,
          type: 'SIGNUP_BONUS',
          description: 'Bonus awal pendaftaran akun self-service (Rp 5.000 / 50 hit gratis)',
        },
      });

      return [user, apiKey];
    });

    // Generate Partner User JWT Token
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };

    const token = await sign(payload, env.JWT_SECRET);

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        companyName: newUser.companyName,
        balance: newUser.balance,
        role: newUser.role,
      },
      apiKey: {
        id: newApiKey.id,
        clientName: newApiKey.clientName,
        keyPrefix: newApiKey.keyPrefix,
        rawKey: rawKey,
      },
    };
  }

  async login(dto: UserLoginDTO): Promise<UserAuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email.trim().toLowerCase());
    if (!user || !user.password || !user.isActive) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };

    const token = await sign(payload, env.JWT_SECRET);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        balance: user.balance,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }
}
