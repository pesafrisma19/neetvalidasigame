import { OpenAPIHono } from '@hono/zod-openapi';
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
