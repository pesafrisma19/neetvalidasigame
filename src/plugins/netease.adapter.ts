import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from './base.adapter.js';
import { extractNestedField } from './base.adapter.js';
import { logger } from '../utils/logger.js';

export class NeteaseAdapter implements BaseProviderAdapter {
  readonly adapterKey = 'NETEASE_ADAPTER';

  async execute(ctx: ValidationContext): Promise<NormalizedResult> {
    const startTime = Date.now();
    logger.info({ adapter: this.adapterKey, gameCode: ctx.gameCode, userId: ctx.userId, slug: ctx.slug }, 'Executing NetEase Pay Validation Adapter');

    if (!ctx.slug) {
      throw new Error('NetEase Provider game slug is required in database mapping');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ctx.timeoutMs);

    const slug = ctx.slug.toLowerCase();
    const hostId = ctx.zoneId && ctx.zoneId.trim() !== '' ? ctx.zoneId.trim() : '-1';
    const baseUrl = ctx.baseUrl.endsWith('/') ? ctx.baseUrl.slice(0, -1) : ctx.baseUrl;

    const targetUrl = new URL(`${baseUrl}/gamesclub/${slug}/${hostId}/login-role`);
    targetUrl.searchParams.append('show_roleid', ctx.userId);
    targetUrl.searchParams.append('device_type', 'pc');

    try {
      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
          'Referer': `https://pay.neteasegames.com/${slug}/topup?from=home`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`NetEase Provider returned HTTP Status ${response.status}`);
      }

      const rawJson = (await response.json()) as any;

      if (rawJson.code !== '0000' || !rawJson.data) {
        throw new Error(rawJson.msg || 'NetEase Player ID or Server ID invalid');
      }

      const nicknamePath = ctx.responseFieldMapping['nickname'] || 'data.rolename';
      const regionPath = ctx.responseFieldMapping['region'] || 'data.alpha2';

      const rawNickname = extractNestedField(rawJson, nicknamePath) || rawJson.data.rolename;
      const rawRegion = extractNestedField(rawJson, regionPath) || rawJson.data.alpha2;

      if (!rawNickname) {
        throw new Error('NetEase Provider response does not contain rolename');
      }

      // Decode unicode escape sequence (e.g. \u00e1 -> á)
      let nickname = String(rawNickname);
      try {
        nickname = JSON.parse(`"${nickname.replace(/"/g, '\\"')}"`);
      } catch (e) {
        // Fallback to raw string if unescaping fails
      }

      return {
        nickname,
        region: rawRegion ? String(rawRegion).toUpperCase() : undefined,
        rawResponse: rawJson,
        responseTimeMs: durationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`NetEase Provider Timed Out after ${ctx.timeoutMs}ms`);
      }
      throw err;
    }
  }
}
