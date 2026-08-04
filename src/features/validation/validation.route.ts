import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { prisma } from '../../lib/prisma.js';
import { ValidationEngineService } from '../../services/engine/validation-engine.service.js';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-envelope.js';
import { apiKeyMiddleware } from '../../middlewares/api-key.middleware.js';
import { rateLimitMiddleware } from '../../middlewares/rate-limit.middleware.js';
import { balanceDeductionMiddleware } from '../../middlewares/balance-deduction.middleware.js';

const validationEngine = new ValidationEngineService(prisma);

export const validationRoute = new OpenAPIHono();

// Enforce X-API-KEY Authentication, Rate Limiting & User Balance Check ONLY on /validate-account route
validationRoute.use('/validate-account', apiKeyMiddleware, rateLimitMiddleware, balanceDeductionMiddleware);

// Public Games Catalog Route (Unauthenticated for Playground UI & Client API Specs)
const getPublicGamesRoute = createRoute({
  method: 'get',
  path: '/games',
  summary: 'List Public Games Catalog with Input Schema (Source of Truth)',
  description: 'Primary source of truth for clients to dynamically retrieve active games, input field schemas (1-slot vs 2-slot), placeholders, labels, and valid sample IDs.',
  tags: ['Public Validation Gateway'],
  responses: {
    200: {
      description: 'Active games catalog list with dynamic input schemas.',
    },
  },
});

validationRoute.openapi(getPublicGamesRoute, async (c) => {
  const games = await prisma.game.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { name: 'asc' },
  });
  return c.json(createSuccessResponse(games, 'Public games fetched'), 200);
});

const ValidateRequestSchema = z.object({
  gameCode: z.string().min(2).openapi({ description: 'Unique game identifier code (retrieve active codes via GET /public/games)', example: 'free-fire' }),
  userId: z.string().min(1).openapi({ description: 'Player User ID / Role ID / Account ID', example: '12345678' }),
  zoneId: z.string().optional().openapi({ description: 'Server ID / Zone ID (required only if game uses 2-slot format in GET /public/games)', example: '1234' }),
});

const ValidateResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: 'Account capability check completed' }),
  data: z.object({
    gameCode: z.string().openapi({ example: 'free-fire' }),
    userId: z.string().openapi({ example: '12345678' }),
    zoneId: z.string().optional().openapi({ example: '1234' }),
    capabilities: z.record(z.any()).openapi({ example: { nickname: 'PlayerOne', firstTopupAvailable: true } }),
  }).openapi({ description: 'Validation result details' }),
});

const postValidateAccountRoute = createRoute({
  method: 'post',
  path: '/validate-account',
  summary: 'Validate Game Account Capabilities',
  description: 'Public API gateway to validate player Nickname, Region, and Account capabilities across games. Before calling this endpoint, clients SHOULD retrieve the available games and their input schema from GET /api/v1/public/games. The request structure (single-slot vs dual-slot) is determined dynamically by the game catalog.',
  tags: ['Public Validation Gateway'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ValidateRequestSchema,
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ValidateResponseSchema,
        },
      },
      description: 'Validation successful.',
    },
    401: {
      description: 'Unauthorized: X-API-KEY header missing, invalid, or revoked.',
    },
    402: {
      description: 'Payment Required / Insufficient user wallet balance (< Rp 100).',
    },
    429: {
      description: 'Too Many Requests: API Key rate limit quota exceeded.',
    },
    400: {
      description: 'Invalid input parameters or regex check failed.',
    },
    404: {
      description: 'Game not found in active catalog.',
    },
    502: {
      description: 'Validation failed across all providers.',
    },
  },
});

validationRoute.openapi(postValidateAccountRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';
    const apiKeyRecord = (c as any).get('apiKey');

    // 1. Execute Validation via Vendor Engine Strategy
    const result = await validationEngine.validateAccount({
      ...body,
      clientIp,
      apiKeyId: apiKeyRecord?.id,
    });

    // 2. POST-SUCCESS ATOMIC DEDUCTION (ONLY IF VALIDATION RETURNED SUCCESS & KEY HAS USER ID)
    if (apiKeyRecord?.userId) {
      await prisma.$transaction(async (tx) => {
        // Single Atomic Conditional Decrement
        const updateRes = await tx.user.updateMany({
          where: {
            id: apiKeyRecord.userId,
            balance: { gte: 100 },
          },
          data: {
            balance: { decrement: 100 },
          },
        });

        if (updateRes.count === 0) {
          throw new Error('INSUFFICIENT_BALANCE_CONCURRENT');
        }

        // Fetch updated balance for snapshot
        const updatedUser = await tx.user.findUnique({
          where: { id: apiKeyRecord.userId },
          select: { balance: true },
        });

        const balanceAfter = updatedUser?.balance || 0;
        const balanceBefore = balanceAfter + 100;

        // Record Audit Mutation Log
        await tx.balanceTransaction.create({
          data: {
            userId: apiKeyRecord.userId,
            apiKeyId: apiKeyRecord.id,
            amount: -100,
            balanceBefore,
            balanceAfter,
            type: 'VALIDATION_DEDUCTION',
            description: `Validasi sukses game '${result.gameCode}' (User ID: ${result.userId})`,
          },
        });
      });
    }

    return c.json(
      createSuccessResponse(
        {
          gameCode: result.gameCode,
          userId: result.userId,
          zoneId: result.zoneId,
          capabilities: result.capabilities,
        },
        'Validation successful'
      ),
      200
    );
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE_CONCURRENT') {
      return c.json(createErrorResponse('Saldo Anda tidak mencukupi untuk transaksi ini', 'INSUFFICIENT_BALANCE', null), 402);
    }
    if (err.message === 'GAME_NOT_FOUND') {
      return c.json(createErrorResponse('Game catalog code tidak ditemukan', 'GAME_NOT_FOUND', null), 404);
    }
    if (err.message === 'INVALID_USER_ID_FORMAT') {
      return c.json(createErrorResponse('Format User ID tidak sesuai', 'INVALID_USER_ID_FORMAT', null), 400);
    }
    if (err.message === 'INVALID_ZONE_ID_FORMAT') {
      return c.json(createErrorResponse('Format Zone/Server ID tidak sesuai', 'INVALID_ZONE_ID_FORMAT', null), 400);
    }
    if (err.message === 'NO_MAPPING_AVAILABLE') {
      return c.json(createErrorResponse('Belum ada provider active untuk game ini', 'NO_MAPPING_AVAILABLE', 503), 503);
    }

    return c.json(
      createErrorResponse('Gagal melakukan validasi ke provider', 'ALL_PROVIDERS_FAILED', err.message),
      502
    );
  }
});
