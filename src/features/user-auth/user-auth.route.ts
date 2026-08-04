import { OpenAPIHono } from '@hono/zod-openapi';
import { prisma } from '../../lib/prisma.js';
import { UserRepository } from '../../repositories/user/user.repository.js';
import { UserAuthService } from '../../services/user/user-auth.service.js';
import { userAuthMiddleware, type JwtPayload } from '../../middlewares/auth.middleware.js';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-envelope.js';

const userRepository = new UserRepository();
const userAuthService = new UserAuthService(userRepository);

export const userAuthRoute = new OpenAPIHono();

// ------------------------------------------------------
// 1. POST /user/register (Self-Service Registration + 1st API Key + Rp 5.000 Bonus)
// ------------------------------------------------------
userAuthRoute.post('/register', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.email || !body.password || !body.name) {
      return c.json(createErrorResponse('Name, email, and password are required', 'VALIDATION_ERROR'), 400);
    }

    if (body.password.length < 6) {
      return c.json(createErrorResponse('Password must be at least 6 characters long', 'VALIDATION_ERROR'), 400);
    }

    const response = await userAuthService.register({
      name: body.name,
      email: body.email,
      password: body.password,
      companyName: body.companyName,
    });

    return c.json(createSuccessResponse(response, 'Account registered successfully with Rp 5.000 free bonus saldo'), 201);
  } catch (err: any) {
    if (err.message === 'EMAIL_ALREADY_EXISTS') {
      return c.json(createErrorResponse('Email is already registered. Please login instead.', 'DUPLICATE_RESOURCE'), 409);
    }
    return c.json(createErrorResponse('Registration failed', 'INTERNAL_SERVER_ERROR', err.message), 500);
  }
});

// ------------------------------------------------------
// 2. POST /user/login (Partner User Login)
// ------------------------------------------------------
userAuthRoute.post('/login', async (c) => {
  try {
    const body = await c.req.json();

    if (!body.email || !body.password) {
      return c.json(createErrorResponse('Email and password are required', 'VALIDATION_ERROR'), 400);
    }

    const response = await userAuthService.login({
      email: body.email,
      password: body.password,
    });

    return c.json(createSuccessResponse(response, 'Login successful'), 200);
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return c.json(createErrorResponse('Invalid email or password', 'UNAUTHORIZED'), 401);
    }
    return c.json(createErrorResponse('Login failed', 'INTERNAL_SERVER_ERROR', err.message), 500);
  }
});

// ------------------------------------------------------
// 3. GET /user/me (User Profile)
// ------------------------------------------------------
// 3. GET /user/me (User Profile)
// ------------------------------------------------------
userAuthRoute.get('/me', userAuthMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload') as JwtPayload;
    const user = await userAuthService.getProfile(payload.sub);

    if (!user) {
      return c.json(createErrorResponse('User account not found', 'NOT_FOUND'), 404);
    }

    return c.json(
      createSuccessResponse(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName,
          balance: user.balance,
          role: user.role,
          createdAt: user.createdAt,
        },
        'User profile retrieved'
      ),
      200
    );
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to fetch profile', 'INTERNAL_SERVER_ERROR', err.message), 500);
  }
});

// ------------------------------------------------------
// 4. GET /user/dashboard (User Dashboard Portal Summary)
// ------------------------------------------------------
userAuthRoute.get('/dashboard', userAuthMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload') as JwtPayload;
    const userId = payload.sub;

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        apiKeys: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return c.json(createErrorResponse('User account not found', 'NOT_FOUND'), 404);
    }

    const apiKey = user.apiKeys[0] || null;

    // Fetch 5 recent balance transactions
    const recentTransactions = await prisma.balanceTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Fetch 5 recent validation logs for user's key
    const recentLogs = apiKey
      ? await prisma.validationLog.findMany({
          where: { apiKeyId: apiKey.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            inputUserId: true,
            inputZoneId: true,
            status: true,
            responseTimeMs: true,
            createdAt: true,
            game: { select: { name: true, code: true } },
          },
        })
      : [];

    return c.json(
      createSuccessResponse(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            companyName: user.companyName,
            balance: user.balance,
            validationsRemaining: Math.floor(user.balance / 100),
          },
          apiKey: apiKey
            ? {
                id: apiKey.id,
                clientName: apiKey.clientName,
                keyPrefix: apiKey.keyPrefix,
                rateLimit: apiKey.rateLimit,
                createdAt: apiKey.createdAt,
              }
            : null,
          recentTransactions,
          recentLogs,
        },
        'User dashboard data fetched'
      ),
      200
    );
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to fetch dashboard data', 'INTERNAL_SERVER_ERROR', err.message), 500);
  }
});

// ------------------------------------------------------
// 5. GET /user/transactions (Full Balance Mutations History)
// ------------------------------------------------------
userAuthRoute.get('/transactions', userAuthMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload') as JwtPayload;
    const userId = payload.sub;

    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.balanceTransaction.count({
        where: { userId },
      }),
    ]);

    return c.json(
      createSuccessResponse(transactions, 'Balance transactions history fetched', {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }),
      200
    );
  } catch (err: any) {
    return c.json(createErrorResponse('Failed to fetch balance transactions', 'INTERNAL_SERVER_ERROR', err.message), 500);
  }
});
