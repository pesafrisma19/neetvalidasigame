import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { PrismaClient } from '@prisma/client';
import { AdminRepository } from '../../repositories/admin/admin.repository.js';
import { AuthService } from '../../services/auth/auth.service.js';
import { adminAuthMiddleware, type JwtPayload } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-envelope.js';

const prisma = new PrismaClient();
const adminRepo = new AdminRepository(prisma);
const authService = new AuthService(adminRepo);

export const authRoute = new OpenAPIHono();

// Login Schemas
const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    token: z.string(),
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.string(),
    }),
  }).nullable(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
  }).nullable(),
});

const postLoginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  summary: 'Admin Login',
  description: 'Authenticate admin user and issue JWT Bearer token.',
  tags: ['Admin Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LoginResponseSchema,
        },
      },
      description: 'Login successful.',
    },
    401: {
      description: 'Invalid credentials.',
    },
  },
});

authRoute.openapi(postLoginRoute, async (c) => {
  try {
    const body = c.req.valid('json');
    const result = await authService.login(body);
    return c.json(createSuccessResponse(result, 'Login successful'), 200);
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return c.json(createErrorResponse('Email atau password salah', 'INVALID_CREDENTIALS', null), 401);
    }
    return c.json(createErrorResponse('Internal Server Error', 'INTERNAL_SERVER_ERROR', null), 500);
  }
});

// Me Profile Endpoint
const getMeRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  summary: 'Current Admin Profile',
  description: 'Get logged in admin profile.',
  tags: ['Admin Auth'],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'Current user profile.',
    },
    401: {
      description: 'Unauthorized.',
    },
  },
});

authRoute.use('/auth/me', adminAuthMiddleware);

authRoute.openapi(getMeRoute, async (c) => {
  const payload = c.get('jwtPayload' as any) as JwtPayload;
  const user = await authService.getProfile(payload.sub);

  if (!user) {
    return c.json(createErrorResponse('User not found', 'NOT_FOUND', null), 404);
  }

  return c.json(
    createSuccessResponse(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      'User profile fetched'
    ),
    200
  );
});
