import type { Context, Next } from 'hono';
import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { createErrorResponse } from '../utils/response-envelope.js';

export async function apiKeyMiddleware(c: Context, next: Next) {
  const apiKeyHeader = c.req.header('X-API-KEY') || c.req.header('x-api-key');

  if (!apiKeyHeader || apiKeyHeader.trim() === '') {
    return c.json(
      createErrorResponse(
        'X-API-KEY header is missing',
        'UNAUTHORIZED',
        'An active API Key must be provided in X-API-KEY header'
      ),
      401
    );
  }

  const rawKey = apiKeyHeader.trim();
  // Strictly enforce SHA-256 hash verification against database records
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  try {
    let apiKeyRecord = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        apiKeyRecord = await prisma.apiKey.findFirst({
          where: {
            keyHash: keyHash,
            isActive: true,
            deletedAt: null,
          },
        });
        break;
      } catch (err: any) {
        attempts++;
        if (attempts >= maxAttempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, 25 * attempts));
      }
    }

    if (!apiKeyRecord) {
      return c.json(
        createErrorResponse(
          'Invalid or revoked X-API-KEY',
          'UNAUTHORIZED',
          'The provided API Key does not exist or has been deactivated'
        ),
        401
      );
    }

    // Attach validated API Key details to context for downstream handlers/rate-limiting
    c.set('apiKey', apiKeyRecord);
    return await next();
  } catch (err: any) {
    return c.json(
      createErrorResponse('Error validating API Key', 'INTERNAL_SERVER_ERROR', err.message),
      500
    );
  }
}
