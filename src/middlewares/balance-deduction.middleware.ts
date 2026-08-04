import type { Context, Next } from 'hono';
import type { ApiKey } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createErrorResponse } from '../utils/response-envelope.js';

export async function balanceDeductionMiddleware(c: Context, next: Next) {
  const apiKeyRecord = c.get('apiKey') as ApiKey | undefined;

  // Fallback check if apiKeyMiddleware was not executed beforehand
  if (!apiKeyRecord) {
    return c.json(
      createErrorResponse(
        'API Key context missing',
        'INTERNAL_SERVER_ERROR',
        'balanceDeductionMiddleware must be executed after apiKeyMiddleware'
      ),
      500
    );
  }

  // STRICT SCOPE ISOLATION: Legacy Partner Keys (userId == null) BYPASS SALDO TOTAL!
  if (!apiKeyRecord.userId) {
    return await next();
  }

  // Pre-Check User Wallet Balance before forwarding request to vendor provider
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: apiKeyRecord.userId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      return c.json(
        createErrorResponse(
          'User account inactive or suspended',
          'UNAUTHORIZED',
          'The owner of this API Key is no longer active'
        ),
        401
      );
    }

    // Pre-Flight Check: Balance must be >= 100 IDR
    if (user.balance < 100) {
      return c.json(
        createErrorResponse(
          'Saldo akun Anda tidak mencukupi (minimal Rp 100)',
          'INSUFFICIENT_BALANCE',
          `Sisa saldo Anda saat ini Rp ${user.balance}. Silakan lakukan top-up saldo via dashboard.`
        ),
        402
      );
    }

    c.set('userAccount', user);
    return await next();
  } catch (err: any) {
    return c.json(
      createErrorResponse('Error checking user balance', 'INTERNAL_SERVER_ERROR', err.message),
      500
    );
  }
}
