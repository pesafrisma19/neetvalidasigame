import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from './base.adapter.js';
import { extractNestedField } from './base.adapter.js';
import { logger } from '../utils/logger.js';

export class GopayAdapter implements BaseProviderAdapter {
  readonly adapterKey = 'GOPAY_ADAPTER';

  async execute(ctx: ValidationContext): Promise<NormalizedResult> {
    const startTime = Date.now();
    logger.info({ adapter: this.adapterKey, gameCode: ctx.gameCode, userId: ctx.userId, slug: ctx.slug }, 'Executing GoPay Games Validation Adapter');

    if (!ctx.slug) {
      throw new Error('GoPay Provider game slug is required in database mapping');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ctx.timeoutMs);

    const slugUpper = ctx.slug.toUpperCase();

    try {
      if (slugUpper === 'MOBILE_LEGENDS') {
        // Mode 1 (MLBB Special Contract): POST /v1/order/user-account for Nickname + Region
        const payload = {
          code: slugUpper,
          data: {
            userId: ctx.userId,
            ...(ctx.zoneId ? { zoneId: ctx.zoneId } : {}),
          },
        };

        const response = await fetch(ctx.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
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

        const nicknamePath = ctx.responseFieldMapping['nickname'] || 'data.username';
        const regionPath = ctx.responseFieldMapping['region'] || 'data.countryOrigin';

        const nickname = extractNestedField(rawJson, nicknamePath);
        const countryOrigin = extractNestedField(rawJson, regionPath);

        if (!nickname) {
          throw new Error('GoPay Provider response does not contain nickname');
        }

        return {
          nickname: String(nickname),
          region: countryOrigin ? String(countryOrigin).toUpperCase() : undefined,
          rawResponse: rawJson,
          responseTimeMs: durationMs,
        };
      } else {
        // Mode 2 (Generic Contract for all other games): GET /v1/order/prepare/{slug}?userId={userId}&zoneId={zoneId}
        const baseUrl = ctx.baseUrl.includes('/prepare')
          ? ctx.baseUrl
          : 'https://gopay.co.id/games/v1/order/prepare';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const targetUrl = new URL(`${cleanBaseUrl}/${slugUpper}`);
        targetUrl.searchParams.append('userId', ctx.userId);
        if (ctx.zoneId) targetUrl.searchParams.append('zoneId', ctx.zoneId);

        const response = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`GoPay Provider returned HTTP Status ${response.status}`);
        }

        const rawJson = (await response.json()) as any;

        if (rawJson.message !== 'Success' || !rawJson.data) {
          throw new Error(rawJson.message || 'GoPay Account invalid or not found');
        }

        const nicknamePath = ctx.responseFieldMapping['nickname'];
        let nickname: any = nicknamePath ? extractNestedField(rawJson, nicknamePath) : undefined;
        if (!nickname && typeof rawJson.data === 'string') {
          nickname = rawJson.data;
        } else if (!nickname && rawJson.data?.username) {
          nickname = rawJson.data.username;
        }

        if (!nickname) {
          throw new Error('GoPay Provider response does not contain nickname');
        }

        return {
          nickname: String(nickname),
          rawResponse: rawJson,
          responseTimeMs: durationMs,
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`GoPay Provider Timed Out after ${ctx.timeoutMs}ms`);
      }
      throw err;
    }
  }
}
