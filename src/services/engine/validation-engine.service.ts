import type { PrismaClient, ValidationStatus } from '@prisma/client';
import type { BaseProviderAdapter, ValidationContext, NormalizedResult } from '../../plugins/base.adapter.js';
import { GopayAdapter } from '../../plugins/gopay.adapter.js';
import { MelpaAdapter } from '../../plugins/melpa.adapter.js';
import { MobapayAdapter } from '../../plugins/mobapay.adapter.js';
import { SupersusAdapter } from '../../plugins/supersus.adapter.js';
import { logger } from '../../utils/logger.js';

export interface ValidateAccountRequest {
  gameCode: string;
  userId: string;
  zoneId?: string;
  clientIp?: string;
}

export interface ValidateAccountResult {
  gameCode: string;
  userId: string;
  zoneId?: string;
  capabilities: {
    nickname?: string;
    region?: string;
    firstTopupAvailable?: boolean;
    firstTopupTiers?: any[];
    [key: string]: unknown;
  };
  meta: {
    providersUsed: string[];
    responseTimeMs: number;
  };
}

export class ValidationEngineService {
  private readonly adapters: Map<string, BaseProviderAdapter> = new Map();

  constructor(private readonly prisma: PrismaClient) {
    // Register built-in provider plugin adapters
    this.registerAdapter(new GopayAdapter());
    this.registerAdapter(new MelpaAdapter());
    this.registerAdapter(new MobapayAdapter());
    this.registerAdapter(new SupersusAdapter());
  }

  registerAdapter(adapter: BaseProviderAdapter) {
    this.adapters.set(adapter.adapterKey, adapter);
    logger.info({ adapterKey: adapter.adapterKey }, 'Registered Validation Provider Plugin');
  }

  async validateAccount(req: ValidateAccountRequest): Promise<ValidateAccountResult> {
    const startTime = Date.now();

    // 1. Fetch Game Catalog & Validate Regex if configured
    const game = await this.prisma.game.findFirst({
      where: { code: req.gameCode, isActive: true, deletedAt: null },
    });

    if (!game) {
      throw new Error('GAME_NOT_FOUND');
    }

    if (game.userIdRegex && !new RegExp(game.userIdRegex).test(req.userId)) {
      throw new Error('INVALID_USER_ID_FORMAT');
    }

    if (game.zoneIdRegex && req.zoneId && !new RegExp(game.zoneIdRegex).test(req.zoneId)) {
      throw new Error('INVALID_ZONE_ID_FORMAT');
    }

    // 2. Fetch All Active Mappings for the Game
    const allMappings = await this.prisma.gameValidationMapping.findMany({
      where: {
        gameId: game.id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        provider: true,
        endpoint: true,
        capability: true,
      },
      orderBy: { priority: 'asc' },
    });

    if (allMappings.length === 0) {
      throw new Error('NO_MAPPING_AVAILABLE');
    }

    // Group mappings by Capability Code to allow Independent Capability Merging
    const mappingsByCapability = new Map<string, typeof allMappings>();
    for (const mapping of allMappings) {
      const capCode = mapping.capability.code;
      if (!mappingsByCapability.has(capCode)) {
        mappingsByCapability.set(capCode, []);
      }
      mappingsByCapability.get(capCode)!.push(mapping);
    }

    const mergedCapabilities: Record<string, unknown> = {};
    const providersUsedSet = new Set<string>();

    // Prepare entries array to guarantee deterministic response capability ordering
    const capabilityEntries = Array.from(mappingsByCapability.entries());

    // 3. Process Each Capability Independently In Parallel (Promise.allSettled)
    const capabilityPromises = capabilityEntries.map(async ([capabilityCode, candidateMappings]) => {
      let capabilityResolved = false;
      let resolvedResult: NormalizedResult | null = null;
      let resolvedProviderName: string | null = null;

      // Priority Fallback Loop for candidate mappings within this capability
      for (const mapping of candidateMappings) {
        const endpoint = mapping.endpoint;
        const provider = mapping.provider;

        if (!endpoint.isActive || provider.status !== 'ACTIVE') {
          continue;
        }

        // Circuit Breaker check
        if (endpoint.circuitState === 'OPEN' && endpoint.circuitOpenUntil && endpoint.circuitOpenUntil > new Date()) {
          logger.warn({ endpointId: endpoint.id, provider: provider.name }, 'Skipping endpoint due to OPEN Circuit Breaker');
          continue;
        }

        const adapter = this.adapters.get(mapping.adapterKey);
        if (!adapter) {
          logger.error({ adapterKey: mapping.adapterKey }, 'Adapter plugin not found');
          continue;
        }

        // Hard Max Timeout Enforcement (Max 2000ms / 2s per provider call)
        const effectiveTimeout = Math.min(endpoint.timeoutMs || 2000, 2000);

        const ctx: ValidationContext = {
          gameCode: game.code,
          userId: req.userId,
          zoneId: req.zoneId,
          slug: mapping.slug,
          baseUrl: endpoint.baseUrl,
          requestParamMapping: (mapping.requestParamMapping as Record<string, string>) || {},
          responseFieldMapping: (mapping.responseFieldMapping as Record<string, string>) || {},
          timeoutMs: effectiveTimeout,
        };

        let timeoutTimer: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => {
            reject(new Error(`Provider call timed out after ${effectiveTimeout}ms`));
          }, effectiveTimeout);
        });

        try {
          // Promise.race between adapter execution and hard 2s timeout
          const result = await Promise.race([adapter.execute(ctx), timeoutPromise]);
          if (timeoutTimer) clearTimeout(timeoutTimer);

          const durationMs = Date.now() - startTime;

          capabilityResolved = true;
          resolvedResult = result;
          resolvedProviderName = provider.name;

          // Non-blocking fire-and-forget success logging
          this.logValidation({
            gameId: game.id,
            providerId: provider.id,
            endpointId: endpoint.id,
            inputUserId: req.userId,
            inputZoneId: req.zoneId,
            status: 'SUCCESS',
            responseTimeMs: durationMs,
            requestJson: req,
            rawResponse: result.rawResponse,
            normalizedResponse: result,
            clientIp: req.clientIp,
          }).catch((err) => logger.error({ err }, 'Failed async success validation logging'));

          // Break fallback loop for this capability on success
          break;
        } catch (err: any) {
          if (timeoutTimer) clearTimeout(timeoutTimer);

          const durationMs = Date.now() - startTime;
          logger.error({ capability: capabilityCode, provider: provider.name, error: err.message }, 'Capability provider failed, attempting fallback');

          // Non-blocking fire-and-forget fallback logging
          this.logValidation({
            gameId: game.id,
            providerId: provider.id,
            endpointId: endpoint.id,
            inputUserId: req.userId,
            inputZoneId: req.zoneId,
            status: 'FALLBACK',
            responseTimeMs: durationMs,
            requestJson: req,
            rawResponse: { error: err.message },
            normalizedResponse: {},
            errorMessage: err.message,
            clientIp: req.clientIp,
          }).catch((logErr) => logger.error({ logErr }, 'Failed async fallback validation logging'));

          // Circuit Breaker counter increment (Non-blocking async DB update)
          const newErrors = endpoint.consecutiveErrors + 1;
          const shouldOpen = newErrors >= 5;

          this.prisma.providerEndpoint
            .update({
              where: { id: endpoint.id },
              data: {
                consecutiveErrors: newErrors,
                circuitState: shouldOpen ? 'OPEN' : endpoint.circuitState,
                circuitOpenUntil: shouldOpen ? new Date(Date.now() + 5 * 60 * 1000) : endpoint.circuitOpenUntil,
              },
            })
            .catch((cbErr) => logger.error({ cbErr }, 'Failed async circuit breaker update'));
        }
      }

      if (!capabilityResolved) {
        logger.warn({ capabilityCode }, 'Failed to resolve capability from any mapped provider');
      }

      return {
        capabilityCode,
        resolved: capabilityResolved,
        result: resolvedResult,
        providerName: resolvedProviderName,
      };
    });

    // Wait for all independent capabilities to complete in parallel
    const settledResults = await Promise.allSettled(capabilityPromises);
    let overallSuccess = false;

    // Merge results preserving initial capability ordering
    for (const item of settledResults) {
      if (item.status === 'fulfilled' && item.value.resolved && item.value.result) {
        const { capabilityCode, result, providerName } = item.value;
        overallSuccess = true;

        if (providerName) {
          providersUsedSet.add(providerName);
        }

        if (capabilityCode === 'NICKNAME' && result.nickname) {
          mergedCapabilities.nickname = result.nickname;
        } else if (capabilityCode === 'REGION' && result.region) {
          mergedCapabilities.region = result.region;
        } else if (capabilityCode === 'FIRST_TOPUP' && result.firstTopupAvailable !== undefined) {
          mergedCapabilities.firstTopupAvailable = result.firstTopupAvailable;
          if (result.rawResponse && (result.rawResponse as any).firstTopupTiers) {
            mergedCapabilities.firstTopupTiers = (result.rawResponse as any).firstTopupTiers;
          }
        }
      }
    }

    if (!overallSuccess) {
      throw new Error('ALL_PROVIDERS_FAILED');
    }

    const durationMs = Date.now() - startTime;

    return {
      gameCode: game.code,
      userId: req.userId,
      zoneId: req.zoneId,
      capabilities: mergedCapabilities,
      meta: {
        providersUsed: Array.from(providersUsedSet),
        responseTimeMs: durationMs,
      },
    };
  }

  private async logValidation(data: {
    gameId: string;
    providerId: string;
    endpointId: string;
    inputUserId: string;
    inputZoneId?: string;
    status: ValidationStatus;
    responseTimeMs: number;
    requestJson: any;
    rawResponse: any;
    normalizedResponse: any;
    errorMessage?: string;
    clientIp?: string;
  }) {
    try {
      await this.prisma.validationLog.create({
        data: {
          gameId: data.gameId,
          providerId: data.providerId,
          endpointId: data.endpointId,
          inputUserId: data.inputUserId,
          inputZoneId: data.inputZoneId,
          status: data.status,
          responseTimeMs: data.responseTimeMs,
          requestJson: data.requestJson,
          rawResponse: data.rawResponse,
          normalizedResponse: data.normalizedResponse,
          errorMessage: data.errorMessage,
          clientIp: data.clientIp,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to record validation log');
    }
  }
}
