import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { ValidationEngineService } from '../../services/engine/validation-engine.service.js';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-envelope.js';

const prisma = new PrismaClient();
const validationEngine = new ValidationEngineService(prisma);

export const validationRoute = new OpenAPIHono();

// Public Games Catalog Route (Unauthenticated for Playground UI)
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
  gameCode: z.string().min(2).openapi({ description: 'Unique game identifier code (from GET /public/games)', example: 'example-single-slot' }),
  userId: z.string().min(1).openapi({ description: 'Player User ID / Role ID / Account ID', example: '12345678' }),
  zoneId: z.string().optional().openapi({ description: 'Server ID / Zone ID (required only if game uses 2-slot format)', example: '1234' }),
});

const ValidateResponseSchema = z.object({
  success: z.boolean().openapi({ example: true }),
  message: z.string().openapi({ example: 'Account capability check completed' }),
  data: z.object({
    gameCode: z.string().openapi({ example: 'example-single-slot' }),
    userId: z.string().openapi({ example: '12345678' }),
    zoneId: z.string().optional().openapi({ example: '1234' }),
    capabilities: z.object({
      nickname: z.string().optional().openapi({ example: 'ExamplePlayer' }),
      region: z.string().optional().openapi({ example: 'ID' }),
      firstTopupAvailable: z.boolean().optional(),
    }),
  }).nullable(),
  meta: z.object({
    responseTimeMs: z.number().openapi({ example: 1200 }),
    providersUsed: z.array(z.string()).optional().openapi({ example: ['GOPAY_ADAPTER'] }),
  }).nullable(),
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
  }).nullable(),
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
          examples: {
            'single-slot-pattern': {
              summary: '1-Slot Pattern (User ID Only)',
              description: 'Example pattern for games requiring only a User ID / Account ID (e.g. Free Fire, Blood Strike, HOK, Super Sus, PUBGM).',
              value: {
                gameCode: 'example-single-slot',
                userId: '12345678',
              },
            },
            'dual-slot-pattern': {
              summary: '2-Slot Pattern (User ID + Zone ID)',
              description: 'Example pattern for games requiring both User ID and Server/Zone ID (e.g. Mobile Legends, Eggy Party, Genshin Impact, Honkai Star Rail).',
              value: {
                gameCode: 'example-dual-slot',
                userId: '12345678',
                zoneId: '1234',
              },
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ValidateResponseSchema,
        },
      },
      description: 'Validation successful.',
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

    const result = await validationEngine.validateAccount({
      ...body,
      clientIp,
    });

    return c.json(
      createSuccessResponse(
        {
          gameCode: result.gameCode,
          userId: result.userId,
          zoneId: result.zoneId,
          capabilities: result.capabilities,
        },
        'Validation successful',
        {
          responseTimeMs: result.meta.responseTimeMs,
          providersUsed: result.meta.providersUsed,
        }
      ),
      200
    );
  } catch (err: any) {
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
