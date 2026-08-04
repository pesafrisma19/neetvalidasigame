import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from './base.adapter.js';

export class MockAdapter implements BaseProviderAdapter {
  readonly adapterKey = 'MOCK_ADAPTER';

  async execute(ctx: ValidationContext): Promise<NormalizedResult> {
    // Simulate invalid user or invalid game code for mock error test case
    if (ctx.userId === '123456' || ctx.gameCode.includes('invalid') || ctx.gameCode.includes('mock')) {
      throw new Error('MOCK_PROVIDER_ACCOUNT_NOT_FOUND');
    }

    // Fast, deterministic 5ms response for valid test accounts
    return {
      nickname: 'MockPlayerOne',
      region: 'ID',
      firstTopupAvailable: true,
      rawResponse: { success: true, nickname: 'MockPlayerOne' },
      responseTimeMs: 5,
    };
  }
}
