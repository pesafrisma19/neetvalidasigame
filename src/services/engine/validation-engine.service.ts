import type { PrismaClient, ValidationStatus } from '@prisma/client';
import type { BaseProviderAdapter, ValidationContext } from '../../plugins/base.adapter.js';
import { GopayAdapter } from '../../plugins/gopay.adapter.js';
import { MelpaAdapter } from '../../plugins/melpa.adapter.js';
import { MobapayAdapter } from '../../plugins/mobapay.adapter.js';
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
    let overallSuccess = false;

    // 3. Process Each Capability Independently (Capability Merging Engine)
    for (const [capabilityCode, candidateMappings] of mappingsByCapability.entries()) {
      let capabilityResolved = false;

      // Priority Fallback Loop for this capability
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

        const ctx: ValidationContext = {
          gameCode: game.code,
          userId: req.userId,
          zoneId: req.zoneId,
          slug: mapping.slug,
          baseUrl: endpoint.baseUrl,
          requestParamMapping: (mapping.requestParamMapping as Record<string, string>) || {},
          responseFieldMapping: (mapping.responseFieldMapping as Record<string, string>) || {},
          timeoutMs: endpoint.timeoutMs || 3000,
        };

        try {
          const result = await adapter.execute(ctx);
          const durationMs = Date.now() - startTime;

          // Merge result based on capability code
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

          providersUsedSet.add(provider.name);
          capabilityResolved = true;
          overallSuccess = true;

          // Async Log Success
          await this.logValidation({
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
          });

          // Break fallback loop for this capability on success
          break;
        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          logger.error({ capability: capabilityCode, provider: provider.name, error: err.message }, 'Capability provider failed, attempting fallback');

          // Async Log Fallback / Failure
          await this.logValidation({
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
          });

          // Circuit Breaker counter increment
          const newErrors = endpoint.consecutiveErrors + 1;
          const shouldOpen = newErrors >= 5;

          await this.prisma.providerEndpoint.update({
            where: { id: endpoint.id },
            data: {
              consecutiveErrors: newErrors,
              circuitState: shouldOpen ? 'OPEN' : endpoint.circuitState,
              circuitOpenUntil: shouldOpen ? new Date(Date.now() + 5 * 60 * 1000) : endpoint.circuitOpenUntil,
            },
          });
        }
      }

      if (!capabilityResolved) {
        logger.warn({ capabilityCode }, 'Failed to resolve capability from any mapped provider');
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
