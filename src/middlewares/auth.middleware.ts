import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { env } from '../config/env.config.js';
import { createErrorResponse } from '../utils/response-envelope.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

export async function adminAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(createErrorResponse('Authorization header missing or invalid', 'UNAUTHORIZED'), 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = (await verify(token, env.JWT_SECRET, 'HS256')) as unknown as JwtPayload;
    c.set('jwtPayload', payload);
    return await next();
  } catch (err) {
    return c.json(createErrorResponse('Token is invalid or has expired', 'UNAUTHORIZED'), 401);
  }
}
