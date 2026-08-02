import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from './base.adapter.js';
import { extractNestedField } from './base.adapter.js';
import { logger } from '../utils/logger.js';

export class MelpaAdapter implements BaseProviderAdapter {
  readonly adapterKey = 'MELPA_ADAPTER';

  async execute(ctx: ValidationContext): Promise<NormalizedResult> {
    const startTime = Date.now();
    logger.info({ adapter: this.adapterKey, gameCode: ctx.gameCode, userId: ctx.userId }, 'Executing Melpa Validation Adapter');

    const userIdKey = ctx.requestParamMapping['userId'] || 'id';
    const zoneIdKey = ctx.requestParamMapping['zoneId'] || 'zone';

    const params: Record<string, string> = {
      [userIdKey]: ctx.userId,
    };

    if (ctx.zoneId) {
      params[zoneIdKey] = ctx.zoneId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ctx.timeoutMs);

    try {
      const url = new URL(ctx.baseUrl.includes('?') ? ctx.baseUrl : `${ctx.baseUrl}/api/game/${ctx.slug}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Melpa Provider returned HTTP Status ${response.status}`);
      }

      const rawJson = (await response.json()) as any;

      if (rawJson.status === false) {
        throw new Error(rawJson.message || 'Melpa User ID or Server ID invalid');
      }

      // Extract capability fields STRICTLY from provider response (Zero Hardcode / Zero Default)
      const nicknamePath = ctx.responseFieldMapping['nickname'] || 'data.username';
      const regionPath = ctx.responseFieldMapping['region'] || 'data.region';

      const nickname = extractNestedField(rawJson, nicknamePath);
      const region = extractNestedField(rawJson, regionPath);

      if (!nickname) {
        throw new Error('Melpa Provider response does not contain nickname');
      }

      return {
        nickname: String(nickname),
        region: region ? String(region) : undefined, // Strictly live or undefined
        rawResponse: rawJson,
        responseTimeMs: durationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Melpa Provider Timed Out after ${ctx.timeoutMs}ms`);
      }
      throw err;
    }
  }
}
