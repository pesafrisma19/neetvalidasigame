import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { createErrorResponse } from '../utils/response-envelope.js';
import { logger } from '../utils/logger.js';

export function errorHandlerMiddleware(err: Error, c: Context) {
  logger.error({ err, path: c.req.path, method: c.req.method }, 'Unhandled Exception Caught');

  if (err instanceof ZodError) {
    return c.json(
      createErrorResponse('Invalid Request Parameters', 'INVALID_INPUT', err.flatten().fieldErrors),
      400
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      createErrorResponse(err.message, 'HTTP_EXCEPTION', null),
      err.status
    );
  }

  return c.json(
    createErrorResponse('Internal Server Error', 'INTERNAL_SERVER_ERROR', null),
    500
  );
}
