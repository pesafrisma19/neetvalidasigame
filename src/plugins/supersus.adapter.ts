import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from './base.adapter.js';
import { extractNestedField } from './base.adapter.js';
import { logger } from '../utils/logger.js';

export class SupersusAdapter implements BaseProviderAdapter {
  readonly adapterKey = 'SUPERSUS_ADAPTER';

  async execute(ctx: ValidationContext): Promise<NormalizedResult> {
    const startTime = Date.now();
    logger.info({ adapter: this.adapterKey, gameCode: ctx.gameCode, userId: ctx.userId }, 'Executing Super Sus WebPay Validation Adapter');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ctx.timeoutMs);

    const baseUrl = ctx.baseUrl.endsWith('/') ? ctx.baseUrl.slice(0, -1) : ctx.baseUrl;
    const url = `${baseUrl}/api/player/${ctx.userId}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'Origin': 'https://webpay.supersus.io',
          'Referer': 'https://webpay.supersus.io/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Super Sus Provider returned HTTP Status ${response.status}`);
      }

      const rawJson = (await response.json()) as any;

      if (rawJson.code !== 0 || !rawJson.data?.name) {
        throw new Error(rawJson.message || 'Super Sus Player ID invalid or not found');
      }

      const nicknamePath = ctx.responseFieldMapping['nickname'] || 'data.name';
      const nickname = extractNestedField(rawJson, nicknamePath);

      if (!nickname) {
        throw new Error('Super Sus Provider response does not contain player nickname');
      }

      return {
        nickname: String(nickname),
        rawResponse: rawJson,
        responseTimeMs: durationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Super Sus Provider Timed Out after ${ctx.timeoutMs}ms`);
      }
      throw err;
    }
  }
}
