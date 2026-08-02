import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from './base.adapter.js';
import { extractNestedField } from './base.adapter.js';
import { logger } from '../utils/logger.js';

export class GopayAdapter implements BaseProviderAdapter {
  readonly adapterKey = 'GOPAY_ADAPTER';

  async execute(ctx: ValidationContext): Promise<NormalizedResult> {
    const startTime = Date.now();
    logger.info({ adapter: this.adapterKey, gameCode: ctx.gameCode, userId: ctx.userId }, 'Executing GoPay Games Validation Adapter');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ctx.timeoutMs);

    // Payload structure required by GoPay Games API: { code: "MOBILE_LEGENDS", data: { userId, zoneId } }
    const payload = {
      code: ctx.slug || 'MOBILE_LEGENDS',
      data: {
        userId: ctx.userId,
        zoneId: ctx.zoneId || '',
      },
    };

    try {
      const response = await fetch(ctx.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok && response.status !== 201) {
        throw new Error(`GoPay Provider returned HTTP Status ${response.status}`);
      }

      const rawJson = (await response.json()) as any;

      if (rawJson.message !== 'Success' || !rawJson.data?.username) {
        throw new Error(rawJson.message || 'GoPay Player ID or Server ID invalid');
      }

      // Extract capability fields STRICTLY from provider response (Zero Hardcode / Zero Default)
      const nicknamePath = ctx.responseFieldMapping['nickname'] || 'data.username';
      const regionPath = ctx.responseFieldMapping['region'] || 'data.countryOrigin';

      const nickname = extractNestedField(rawJson, nicknamePath);
      const countryOrigin = extractNestedField(rawJson, regionPath);

      if (!nickname) {
        throw new Error('GoPay Provider response does not contain nickname');
      }

      return {
        nickname: String(nickname),
        region: countryOrigin ? String(countryOrigin).toUpperCase() : undefined, // Strictly live or undefined
        rawResponse: rawJson,
        responseTimeMs: durationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`GoPay Provider Timed Out after ${ctx.timeoutMs}ms`);
      }
      throw err;
    }
  }
}
