import type { Context, Next } from 'hono';
import type { ApiKey } from '@prisma/client';
import { createErrorResponse } from '../utils/response-envelope.js';

// Sliding Window In-Memory Store: Map<`${apiKeyId}:${endpointPath}`, number[]>
const requestStore = new Map<string, number[]>();

/**
 * Periodically prunes stale empty keys from memory every 10 minutes
 */
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [storeKey, timestamps] of requestStore.entries()) {
    const validTimestamps = timestamps.filter((t) => now - t < 60000);
    if (validTimestamps.length === 0) {
      requestStore.delete(storeKey);
    } else {
      requestStore.set(storeKey, validTimestamps);
    }
  }
}, PRUNE_INTERVAL_MS);

export async function rateLimitMiddleware(c: Context, next: Next) {
  const apiKeyRecord = c.get('apiKey') as ApiKey | undefined;

  // Fallback check if apiKeyMiddleware was not executed beforehand
  if (!apiKeyRecord) {
    return c.json(
      createErrorResponse(
        'API Key context missing',
        'INTERNAL_SERVER_ERROR',
        'rateLimitMiddleware must be executed after apiKeyMiddleware'
      ),
      500
    );
  }

  const now = Date.now();
  const windowMs = 60000; // 1 minute sliding window
  const maxLimit = apiKeyRecord.rateLimit ?? 100;
  const storeKey = `${apiKeyRecord.id}:${c.req.path}`;

  // Retrieve or initialize timestamp array
  let timestamps = requestStore.get(storeKey) || [];

  // Filter out timestamps older than 60 seconds (Sliding Window)
  timestamps = timestamps.filter((t) => now - t < windowMs);

  const currentUsage = timestamps.length;
  const remaining = Math.max(0, maxLimit - (currentUsage + 1));
  const oldestTimestamp = timestamps[0] || now;
  const resetTimestampSec = Math.ceil((oldestTimestamp + windowMs) / 1000);
  const retryAfterSec = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

  // Set standard rate limit headers on response
  c.header('X-RateLimit-Limit', maxLimit.toString());
  c.header('X-RateLimit-Reset', resetTimestampSec.toString());

  // Check if rate limit exceeded
  if (currentUsage >= maxLimit) {
    c.header('X-RateLimit-Remaining', '0');
    c.header('Retry-After', retryAfterSec.toString());

    return c.json(
      createErrorResponse(
        'Rate limit exceeded',
        'TOO_MANY_REQUESTS',
        `You have exceeded your limit of ${maxLimit} requests per minute. Please retry after ${retryAfterSec} seconds.`,
        {
          rateLimit: maxLimit,
          currentUsage,
          retryAfterSeconds: retryAfterSec,
        }
      ),
      429
    );
  }

  // Push current request timestamp into sliding window
  timestamps.push(now);
  requestStore.set(storeKey, timestamps);

  c.header('X-RateLimit-Remaining', remaining.toString());

  return await next();
}
