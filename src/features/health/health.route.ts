import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createSuccessResponse } from '../../utils/response-envelope.js';

export const healthRoute = new OpenAPIHono();

const HealthDataSchema = z.object({
  status: z.string(),
  uptimeSeconds: z.number(),
  environment: z.string(),
});

const HealthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: HealthDataSchema.nullable(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
  }).nullable(),
});

const getHealthRoute = createRoute({
  method: 'get',
  path: '/health',
  summary: 'System Health Check',
  description: 'Returns status, uptime, and environment of the Validation Platform API.',
  tags: ['Health Check'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
      description: 'System is healthy and operational.',
    },
  },
});

healthRoute.openapi(getHealthRoute, (c) => {
  return c.json(
    createSuccessResponse(
      {
        status: 'UP',
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
      },
      'System Operational'
    ),
    200
  );
});
