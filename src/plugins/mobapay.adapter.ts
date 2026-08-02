import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from './base.adapter.js';
import { logger } from '../utils/logger.js';

export class MobapayAdapter implements BaseProviderAdapter {
  readonly adapterKey = 'MOBAPAY_ADAPTER';

  private readonly DD_ITEMS: Record<string, string> = {
    '126306': '50+50💎',
    '126307': '150+150💎',
    '126315': '250+250💎',
    '126316': '500+500💎',
  };

  async execute(ctx: ValidationContext): Promise<NormalizedResult> {
    const startTime = Date.now();
    logger.info({ adapter: this.adapterKey, gameCode: ctx.gameCode, userId: ctx.userId }, 'Executing Mobapay Validation Adapter via api/app_shop');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ctx.timeoutMs);

    try {
      const baseUrl = 'https://api.mobapay.com/api/app_shop';
      const url = new URL(baseUrl);
      url.searchParams.append('app_id', '100000');
      url.searchParams.append('game_user_key', ctx.userId);
      if (ctx.zoneId) url.searchParams.append('game_server_key', ctx.zoneId);
      url.searchParams.append('country', 'ID');
      url.searchParams.append('language', 'en');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'x-lang': 'en',
          'origin': 'https://www.mobapay.com',
          'referer': 'https://www.mobapay.com/',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Mobapay Provider returned HTTP Status ${response.status}`);
      }

      const rawJson = (await response.json()) as any;

      if (rawJson.code !== 0 || !rawJson.data) {
        throw new Error(`Mobapay API error (${rawJson.code}): ${rawJson.message || 'Account or Server ID invalid'}`);
      }

      const nickname = rawJson.data?.user_info?.user_name || undefined;

      // Extract all goods items from shop_info
      const allGoods = [
        ...(rawJson.data?.goods || []),
        ...(rawJson.data?.shop_info?.good_list || []),
        ...(rawJson.data?.shop_info?.shelf_location || []).flatMap((s: any) => s.goods || []),
      ];

      let firstTopupAvailable = false;
      const firstTopupTiers = Object.entries(this.DD_ITEMS).map(([itemId, itemName]) => {
        const good = allGoods.find((g: any) => g.id == itemId);
        const reachedLimit = good?.goods_limit?.reached_limit === true;
        const available = good ? !reachedLimit : false;

        if (available) {
          firstTopupAvailable = true;
        }

        const diamonds = parseInt(itemName.split('+')[0], 10) || 0;
        return {
          id: itemId,
          name: itemName,
          diamonds,
          bonus: diamonds,
          price: good ? good.price : 0,
          available,
          statusText: good ? (reachedLimit ? 'Batas pembelian tercapai' : 'Tersedia') : 'Tidak ditemukan',
        };
      });

      return {
        nickname: nickname ? String(nickname) : undefined,
        firstTopupAvailable,
        rawResponse: {
          ...rawJson,
          firstTopupTiers,
        },
        responseTimeMs: durationMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Mobapay Provider Timed Out after ${ctx.timeoutMs}ms`);
      }
      throw err;
    }
  }
}
