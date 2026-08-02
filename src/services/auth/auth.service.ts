import { sign } from 'hono/jwt';
import bcrypt from 'bcrypt';
import { env } from '../../config/env.config.js';
import type { AdminRepository } from '../../repositories/admin/admin.repository.js';
import type { AdminUser } from '@prisma/client';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class AuthService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async login(dto: LoginDTO): Promise<AuthResponse> {
    const user = await this.adminRepository.findByEmail(dto.email);

    if (!user || !user.password) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Generate JWT Token using Hono's built-in JWT utility
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    const token = await sign(payload, env.JWT_SECRET);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string): Promise<AdminUser | null> {
    return this.adminRepository.findById(userId);
  }
}
