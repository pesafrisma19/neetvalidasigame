import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { ValidationEngineService } from '../../services/engine/validation-engine.service.js';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-envelope.js';

const prisma = new PrismaClient();
const validationEngine = new ValidationEngineService(prisma);

export const validationRoute = new OpenAPIHono();

const ValidateRequestSchema = z.object({
  gameCode: z.string().min(2).openapi({ example: 'mobile-legends' }),
  userId: z.string().min(1).openapi({ example: '12345678' }),
  zoneId: z.string().optional().openapi({ example: '2001' }),
});

const ValidateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    gameCode: z.string(),
    userId: z.string(),
    zoneId: z.string().optional(),
    capabilities: z.object({
      nickname: z.string().optional(),
      region: z.string().optional(),
      firstTopupAvailable: z.boolean().optional(),
    }),
  }).nullable(),
  meta: z.object({
    responseTimeMs: z.number(),
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
  description: 'Public API gateway to validate player Nickname, Region, and First Topup eligibility across games.',
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
      description: 'Game not found.',
    },
    502: {
      description: 'Validation failed on all endpoints.',
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

    // Strip internal provider code from public output for Provider Agnostic security
    return c.json(
      createSuccessResponse(
        {
          gameCode: result.gameCode,
          userId: result.userId,
          zoneId: result.zoneId,
          capabilities: result.capabilities,
        },
        'Validation successful',
        { responseTimeMs: result.meta.responseTimeMs }
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
